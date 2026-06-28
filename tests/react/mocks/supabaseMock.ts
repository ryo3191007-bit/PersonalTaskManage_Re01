type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type InputTables = Record<string, object[]>;
type Filter = { column: string; value: unknown };
type Operation = 'select' | 'insert' | 'update' | 'delete';
type FailureRule = {
  table: string;
  operation: Operation;
  column?: string;
  value?: unknown;
  message?: string;
  once?: boolean;
};

type AuthSession = {
  access_token?: string;
  user?: Row;
} | null;

interface QueryResult {
  data: unknown;
  error: Error | null;
}

function cloneRows(rows: Row[]): Row[] {
  return rows.map(row => ({ ...row }));
}

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every(filter => row[filter.column] === filter.value);
}

class SupabaseQueryMock implements PromiseLike<QueryResult> {
  private operation: Operation = 'select';
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private payload: Row | Row[] | null = null;
  private resultMode: 'many' | 'single' | 'maybeSingle' = 'many';

  constructor(
    private readonly tables: Tables,
    private readonly tableName: string,
    private readonly calls: Row[],
    private readonly failures: FailureRule[]
  ) {}

  select(columns = '*') {
    this.calls.push({ table: this.tableName, method: 'select', columns });
    return this;
  }

  insert(payload: Row | Row[]) {
    this.operation = 'insert';
    this.payload = payload;
    this.calls.push({ table: this.tableName, method: 'insert', payload });
    return this;
  }

  update(payload: Row) {
    this.operation = 'update';
    this.payload = payload;
    this.calls.push({ table: this.tableName, method: 'update', payload });
    return this;
  }

  delete() {
    this.operation = 'delete';
    this.calls.push({ table: this.tableName, method: 'delete' });
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    this.calls.push({ table: this.tableName, method: 'eq', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    this.calls.push({ table: this.tableName, method: 'order', column, ascending: this.orderBy.ascending });
    return this;
  }

  single() {
    this.resultMode = 'single';
    this.calls.push({ table: this.tableName, method: 'single' });
    return this;
  }

  maybeSingle() {
    this.resultMode = 'maybeSingle';
    this.calls.push({ table: this.tableName, method: 'maybeSingle' });
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    const failureIndex = this.failures.findIndex(rule => {
      const filterMatches = rule.column === undefined
        ? true
        : this.filters.some(filter => filter.column === rule.column && filter.value === rule.value);
      return rule.table === this.tableName && rule.operation === this.operation && filterMatches;
    });
    if (failureIndex >= 0) {
      const failure = this.failures[failureIndex];
      if (failure.once) this.failures.splice(failureIndex, 1);
      return { data: null, error: new Error(failure.message ?? 'Supabase mock failure') };
    }

    const rows = this.tables[this.tableName] ?? [];
    let data: unknown = null;

    if (this.operation === 'insert') {
      const inserted = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const cloned = cloneRows(inserted as Row[]);
      this.tables[this.tableName] = [...rows, ...cloned];
      data = cloned;
    } else if (this.operation === 'update') {
      const patch = (this.payload ?? {}) as Row;
      const updated: Row[] = [];
      this.tables[this.tableName] = rows.map(row => {
        if (!matchesFilters(row, this.filters)) return row;
        const next = { ...row, ...patch };
        updated.push(next);
        return next;
      });
      data = updated;
    } else if (this.operation === 'delete') {
      const deleted = rows.filter(row => matchesFilters(row, this.filters));
      this.tables[this.tableName] = rows.filter(row => !matchesFilters(row, this.filters));
      data = deleted;
    } else {
      let selected = rows.filter(row => matchesFilters(row, this.filters));
      if (this.orderBy) {
        const { column, ascending } = this.orderBy;
        selected = [...selected].sort((a, b) => {
          const av = String(a[column] ?? '');
          const bv = String(b[column] ?? '');
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      data = cloneRows(selected);
    }

    if (this.resultMode === 'single') {
      const result = Array.isArray(data) ? data[0] ?? null : data;
      return { data: result, error: result ? null : new Error('No rows') };
    }

    if (this.resultMode === 'maybeSingle') {
      const result = Array.isArray(data) ? data[0] ?? null : data;
      return { data: result, error: null };
    }

    return { data, error: null };
  }
}

export function createSupabaseMock(
  initialTables: InputTables = {},
  session: AuthSession = null,
  options: { failures?: FailureRule[] } = {}
) {
  const tables: Tables = {};
  for (const [name, rows] of Object.entries(initialTables)) {
    tables[name] = cloneRows(rows as Row[]);
  }

  const calls: Row[] = [];
  const failures = [...(options.failures ?? [])];
  const authStateListeners: Array<(event: string, nextSession: AuthSession) => void> = [];

  const supabase = {
    from(tableName: string) {
      calls.push({ method: 'from', table: tableName });
      if (!tables[tableName]) tables[tableName] = [];
      return new SupabaseQueryMock(tables, tableName, calls, failures);
    },
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signInWithPassword: async (credentials: Row) => {
        calls.push({ method: 'signInWithPassword', credentials });
        return { data: { session }, error: null };
      },
      signUp: async (credentials: Row) => {
        calls.push({ method: 'signUp', credentials });
        return { data: { session }, error: null };
      },
      signOut: async () => {
        calls.push({ method: 'signOut' });
        return { error: null };
      },
      onAuthStateChange: (callback: (event: string, nextSession: AuthSession) => void) => {
        authStateListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const index = authStateListeners.indexOf(callback);
                if (index >= 0) authStateListeners.splice(index, 1);
              },
            },
          },
        };
      },
    },
  };

  return {
    supabase,
    tables,
    calls,
    emitAuthStateChange(event: string, nextSession: AuthSession) {
      authStateListeners.forEach(listener => listener(event, nextSession));
    },
  };
}
