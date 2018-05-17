import {
  exception,
  IArray,
  IBuiltIn,
  IConstructorAlias,
  ICustomSerializedObject,
  IInstance,
  IObjectLiteral,
  IReference,
  ISerializationOptions,
  Primitive,
  Serialized
} from "./";

export interface IAlreadySerialized {
  source: any;
  result:
    | IArray
    | IBuiltIn
    | IInstance
    | ICustomSerializedObject
    | IObjectLiteral;
}

function isPrimitiveType(source: any): source is Primitive {
  return (
    typeof source === "string" ||
    typeof source === "number" ||
    typeof source === "boolean" ||
    typeof source === "undefined" ||
    source === null
  );
}

function isBuiltInType(
  source: any
): source is Date | Map<any, any> | Set<any> | RegExp {
  return (
    source instanceof Date ||
    source instanceof Map ||
    source instanceof Set ||
    source instanceof RegExp
  );
}

function isSymbol(source: any): source is symbol {
  return typeof source === "symbol";
}

function isFunction(source: any): source is Function {
  return typeof source === "function";
}

function isObjectLiteral(source: any): source is object {
  return source && source.constructor && source.constructor.name === "Object";
}

function isInstance(source: any): source is object {
  return !isObjectLiteral(source) && typeof source === "object";
}

export default function serialize(
  constructors: Array<IConstructorAlias<any>>,
  options: ISerializationOptions
) {
  let counter = 0;
  function nextIndex(length = 32) {
    return counter++;
  }

  function findAlreadySerialized(
    source: any,
    alreadySerialized: IAlreadySerialized[]
  ): IReference | undefined {
    const existing = alreadySerialized.find(i => i.source === source);
    if (existing) {
      if (typeof existing.result.id === "undefined") {
        existing.result.id = nextIndex();
      }
      return { type: "reference", id: existing.result.id };
    }
  }

  function serializeObjectLiteral(
    source: { [key: string]: any },
    alreadySerialized: IAlreadySerialized[]
  ): IObjectLiteral | IReference {
    const existing = findAlreadySerialized(source, alreadySerialized);
    if (existing) {
      return existing;
    } else {
      const result: IObjectLiteral = { type: "object", value: {} };
      alreadySerialized.push({ source, result });
      const keys = Object.keys(source);
      for (const key of keys) {
        result.value[key] = doSerialize(source[key], alreadySerialized);
      }
      return result;
    }
  }

  function serializeInstance(
    source: any,
    alreadySerialized: IAlreadySerialized[]
  ): IInstance | ICustomSerializedObject | IReference {
    const existing = findAlreadySerialized(source, alreadySerialized);
    if (existing) {
      return existing;
    } else {
      const customCtor = constructors.find(c => source instanceof c.ctor);

      if (customCtor) {
        if (customCtor.serializer) {
          const result: ICustomSerializedObject = {
            class:
              typeof customCtor.name !== "undefined"
                ? customCtor.name
                : source.constructor.name,
            type: "custom",
            value: undefined
          };

          alreadySerialized.push({ source, result });

          result.value = customCtor.serializer(
            source,
            alreadySerialized,
            (src: any, alreadySerializedParam: IAlreadySerialized[]) =>
              doSerialize(src, alreadySerializedParam)
          );

          return result;
        } else {
          const result: IInstance = {
            class:
              typeof customCtor.name !== "undefined"
                ? customCtor.name
                : source.constructor.name,
            props: {},
            type: "instance"
          };

          alreadySerialized.push({ source, result });

          const keys = Object.keys(source);
          for (const key of keys) {
            const val = source[key];
            result.props[key] = doSerialize(val, alreadySerialized);
          }

          return result;
        }
      } else {
        throw new Error(
          `Cannot serialize object with constructor ${
            source.constructor.name
          }. Specify a custom serialize function to handle this type.`
        );
      }
    }
  }

  function serializeArray(
    source: any,
    alreadySerialized: IAlreadySerialized[]
  ): IArray | IReference {
    const existing = findAlreadySerialized(source, alreadySerialized);
    if (existing) {
      return existing;
    } else {
      const result: IArray = { type: "array", items: [] };
      alreadySerialized.push({ source, result });
      for (const item of source) {
        result.items.push(doSerialize(item, alreadySerialized));
      }
      return result;
    }
  }

  function serializeBuiltInType(
    source: any,
    alreadySerialized: IAlreadySerialized[]
  ): IBuiltIn | IReference {
    const existing = findAlreadySerialized(source, alreadySerialized);
    if (existing) {
      return existing;
    } else {
      if (source instanceof Date) {
        return {
          class: "Date",
          type: "builtin",
          value: source.toString()
        };
      } else if (source instanceof Map) {
        const result: IBuiltIn = {
          class: "Map",
          type: "builtin",
          value: []
        };
        alreadySerialized.push({ source, result });
        for (const entry of source.entries()) {
          const [key, val] = entry;
          result.value.push([
            doSerialize(key, alreadySerialized),
            doSerialize(val, alreadySerialized)
          ]);
        }
        return result;
      } else if (source instanceof Set) {
        const result: IBuiltIn = {
          class: "Set",
          type: "builtin",
          value: []
        };
        alreadySerialized.push({ source, result });
        for (const entry of source.entries()) {
          result.value.push(doSerialize(entry[0], alreadySerialized));
        }
        return result;
      } else if (source instanceof RegExp) {
        const result: IBuiltIn = {
          class: "RegExp",
          type: "builtin",
          value: source.toString().slice(1, -1)
        };
        alreadySerialized.push({ source, result });
        return result;
      } else {
        return exception(`Unknown builtin type ${source.constructor.name}.`);
      }
    }
  }

  /*
    Types to handle
    export type Serialized =
      | Primitive
      | PrimitiveNonSerializable
      | IObjectLiteral
      | ISpecialType
      | IInstance
      | ICustomSerializedObject
      | IArray
      | IReference;
  */
  function doSerialize(
    source: any,
    alreadySerialized: IAlreadySerialized[]
  ): Serialized {
    const result: Serialized = isPrimitiveType(source)
      ? source
      : isSymbol(source)
        ? options.serializeSymbol
          ? options.serializeSymbol(source)
          : {
              type: "symbol",
              value: source.toString().slice(7, -1)
            }
        : isFunction(source)
          ? options.serializeFunction
            ? options.serializeFunction(source)
            : { type: "function", value: (source as Function).name }
          : isBuiltInType(source)
            ? serializeBuiltInType(source, alreadySerialized)
            : Array.isArray(source)
              ? serializeArray(source, alreadySerialized)
              : isObjectLiteral(source)
                ? serializeObjectLiteral(source, alreadySerialized)
                : isInstance(source)
                  ? serializeInstance(source, alreadySerialized)
                  : exception(`Cannot serialize ${source.toString()}.`);
    return result;
  }

  return (source: any) => doSerialize(source, []);
}
