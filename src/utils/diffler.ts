/**
 * @dev this is a modified version of the `diffler` npm package.
 * The modification adds exact types.
 * @license MIT https://github.com/omgaz/diffler
 * Author: Gary Chisholm @omgaz
 */

type SimpleJSONValue = string | number | boolean;

type OutType<A, B> = A extends SimpleJSONValue
  ? Readonly<A> extends Readonly<B>
    ? never
    : { from: A; to: B }
  : {
      // intersecting properties
      [K in keyof (A | B)]: Readonly<A[K]> extends Readonly<B[K]>
        ? never
        : OutType<Readonly<A[K]>, Readonly<B[K]>>;
    } & {
      // non intersecting properties only on A
      [Y in keyof Omit<A, keyof B>]: { from: A[Y]; to: null };
    } & {
      // non intersecting properties only on B
      [Z in keyof Omit<B, keyof A>]: { from: null; to: B[Z] };
    };

export function diffler<
  A extends Readonly<Record<string, unknown>>,
  B extends Readonly<Record<string, unknown>>
>(obj1: Readonly<A>, obj2: Readonly<B>): OutType<Readonly<A>, Readonly<B>> {
  let diff = {} as OutType<Readonly<A>, Readonly<B>>;

  // Iterate over obj1 looking for removals and differences in existing values
  for (const key in obj1) {
    if (obj1.hasOwnProperty(key) && typeof obj1[key] !== "function") {
      const obj1Val = obj1[key];
      const obj2Val = obj2[key];

      if (typeof obj1Val !== typeof obj2Val) {
        diff[key as string] = {
          from: obj1Val,
          to: obj2Val,
        };
        break;
      }

      // If property exists in obj1 and not in obj2 then it has been removed
      if (!(key in obj2)) {
        diff[key as string] = {
          from: obj1Val,
          to: null, // using null to specify that the value is empty in obj2
        };
      }

      // If property is an object then we need to recursively go down the rabbit hole
      else if (typeof obj1Val === "object") {
        var tempDiff = diffler(
          obj1Val as Record<string, unknown>,
          obj2Val as Record<string, unknown>
        );
        if (Object.keys(tempDiff).length > 0) {
          if (tempDiff) {
            diff[key as string] = tempDiff;
          }
        }
      }

      // If property is in both obj1 and obj2 and is different
      else if ((obj1Val as string) !== (obj2Val as string)) {
        diff[key as string] = {
          from: obj1Val,
          to: obj2Val,
        };
      }
    }
  }

  // Iterate over obj2 looking for any new additions
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key) && typeof obj2[key] !== "function") {
      if (obj1 === null) {
        diff[key as string] = {
          from: obj1,
          to: obj2[key],
        };
        break;
      }

      const obj2Val = obj2[key];

      if (!(key in obj1)) {
        if (!diff) {
          (diff as unknown) = {};
        }
        diff[key as string] = {
          from: null,
          to: obj2Val,
        };
      }
    }
  }

  return diff as OutType<Readonly<A>, Readonly<B>>;
}
