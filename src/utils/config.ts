export function getEnv<A>(name: string, coerce: (val: string) => A, defaultValue?: A): A;
export function getEnv(name: string, defaultValue?: string): string;
export function getEnv<A = string>(name: string, ...args: any[]): A {
  let coerce: (val: string) => A;
  let defaultValue: A;
  if (args[0] != null && typeof args[0] === 'function') {
    coerce = args[0];
    defaultValue = args[1];
  } else {
    coerce = (value: string) => value as any;
    defaultValue = args[0];
  }

  const variable = process.env[name];
  if (variable) {
    return coerce(variable);
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    throw `Missing ${name} environment variable`;
  }
}

export const cached = <A>(fn: () => A) => {
  let cache: A | undefined = undefined;
  return () => {
    if (cache === undefined) {
      cache = fn();
    }
    return cache;
  };
};

export const envReader = (name: string) => cached(() => getEnv(name));

export const defaultEnv = (name: string, value: string) => {
  if (process.env[name] == null) {
    process.env[name] = value;
  }
};

export function defaultEnvFor(
  nodeEnv: string | string[],
  initializer: () => Record<string, string>
) {
  let nodeEnvs = nodeEnv instanceof Array ? nodeEnv : [nodeEnv];
  if (process.env.NODE_ENV && nodeEnvs.includes(process.env.NODE_ENV)) {
    const defaultValues = initializer();
    Object.keys(defaultValues).forEach(key => {
      defaultEnv(key, defaultValues[key]);
    });
  }
}
