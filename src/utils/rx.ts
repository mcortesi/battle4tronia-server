import { Observable, interval, defer, from } from 'rxjs';
import { startWith, concatMap, distinctUntilChanged } from 'rxjs/operators';

export function poll<A>(opts: { period: number; poller: () => Promise<A> }): Observable<A> {
  return interval(opts.period).pipe(
    startWith(-1),
    concatMap(() => promiseFactory(opts.poller))
  );
}

export function promiseFactory<A>(fn: () => Promise<A>): Observable<A> {
  return defer(() => from(fn()));
}

export function seqAsync<A1, B>(
  f1: () => Promise<A1>,
  fn: (v1: A1) => Observable<B>
): Observable<B> {
  return promiseFactory(f1).pipe(concatMap(fn));
}

export function pollDifferences<A>(opts: {
  period: number;
  poller: () => Promise<A>;
  compareFn?: (before: A, after: A) => boolean;
}): Observable<A> {
  return poll({ period: opts.period, poller: opts.poller }).pipe(
    distinctUntilChanged(opts.compareFn)
  );
}
