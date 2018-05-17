import {
  exception,
  IArray,
  IBuiltIn,
  IConstructorAlias,
  ICustomSerializedObject,
  IFunction,
  IInstance,
  IObjectLiteral,
  IReference,
  ISerializationOptions,
  ISymbol,
  Primitive,
  Serialized
} from "./";

export interface IAlreadyDeserialized {
  source:
    | IArray
    | IBuiltIn
    | IInstance
    | ICustomSerializedObject
    | IObjectLiteral;
  result: any;
}

function isPrimitiveType(source: Serialized): source is Primitive {
  return (
    typeof source === "string" ||
    typeof source === "number" ||
    typeof source === "boolean" ||
    typeof source === "undefined" ||
    source === null
  );
}

function isSymbol(source: Serialized): source is ISymbol {
  return !isPrimitiveType(source) && source.type === "symbol";
}

function isFunction(source: Serialized): source is IFunction {
  return !isPrimitiveType(source) && source.type === "function";
}

function isBuiltInType(source: Serialized): source is IBuiltIn {
  return !isPrimitiveType(source) && source.type === "builtin";
}

function isArray(source: Serialized): source is IArray {
  return !isPrimitiveType(source) && source.type === "array";
}

function isObjectLiteral(source: Serialized): source is IObjectLiteral {
  return !isPrimitiveType(source) && source.type === "object";
}

function isCustomSerializedObject(
  source: Serialized
): source is ICustomSerializedObject {
  return !isPrimitiveType(source) && source.type === "custom";
}

function isInstance(source: Serialized): source is IInstance {
  return !isPrimitiveType(source) && source.type === "instance";
}

function isReference(source: Serialized): source is IReference {
  return !isPrimitiveType(source) && source.type === "reference";
}

export default function deserialize(
  constructors: Array<IConstructorAlias<any>>,
  options: ISerializationOptions
) {
  function deserializeBuiltInType(
    source: IBuiltIn,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): Date | Map<any, any> | Set<any> | RegExp {
    if (source.class === "Date") {
      return new Date(source.value);
    } else if (source.class === "Map") {
      const result = new Map();
      alreadyDeserialized.push({ source, result });
      for (const [key, val] of source.value) {
        result.set(
          doDeserialize(key, alreadyDeserialized),
          doDeserialize(val, alreadyDeserialized)
        );
      }
      return result;
    } else if (source.class === "Set") {
      const result = new Set();
      alreadyDeserialized.push({ source, result });
      for (const entry of source.value) {
        result.add(doDeserialize(entry, alreadyDeserialized));
      }
      return result;
    } else if (source.class === "RegExp") {
      const result = new RegExp(source.value);
      alreadyDeserialized.push({ source, result });
      return result;
    } else {
      return exception(`Unknown special type with ctor ${source.class}.`);
    }
  }

  function deserializeArray(
    source: IArray,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): any[] {
    const result: any = [];
    alreadyDeserialized.push({ source, result });
    for (const item of source.items) {
      result.push(doDeserialize(item, alreadyDeserialized));
    }
    return result;
  }

  function deserializeObjectLiteral(
    source: IObjectLiteral,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    alreadyDeserialized.push({ source, result });
    const keys = Object.keys(source.value);
    for (const key of keys) {
      result[key] = doDeserialize(source.value[key], alreadyDeserialized);
    }
    return result;
  }

  function deserializeReference(
    source: IReference,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): any {
    const item = alreadyDeserialized.find(i => i.source.id === source.id);
    return typeof item !== "undefined"
      ? item.result
      : exception(`Cannot find reference with id ${source.id}.`);
  }

  function deserializeInstance(
    source: IInstance,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): any {
    const customCtor = constructors.find(
      c => source.class === c.name || source.class === c.ctor.name
    );

    if (typeof customCtor !== "undefined") {
      const result: any = new customCtor.ctor();
      alreadyDeserialized.push({ source, result });
      const keys = Object.keys(source.props);
      for (const key of keys) {
        const val = source.props[key];
        result[key] = doDeserialize(val, alreadyDeserialized);
      }
      return result;
    }
  }

  function deserializeCustomSerializedObject(
    source: ICustomSerializedObject,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): any {
    const customCtor = constructors.find(
      c => source.class === c.name || source.class === c.ctor.name
    );
    if (customCtor && customCtor.deserializer) {
      
      const result: any = customCtor.deserializer(
        source.value,
        source,
        alreadyDeserialized,
        (src: any, alreadyDeserializedParam: IAlreadyDeserialized[]) =>
          doDeserialize(src, alreadyDeserializedParam)
      );

      return result;
    } else {
      exception(
        `Missing deserializer for custom deserialized object of type '${
          source.type
        }' and ctor '${source.class}'.`
      );
    }
  }

  /*
    Types to handle
    export type Serialized =
      | Primitive
      | PrimitiveNonSerializable
      | IObjectLiteral
      | IBuiltIn
      | IInstance
      | ICustomSerializedObject
      | IArray
      | IReference;
  */
  function doDeserialize(
    source: Serialized,
    alreadyDeserialized: IAlreadyDeserialized[]
  ): any {
    const result: any = isPrimitiveType(source)
      ? source
      : isSymbol(source)
        ? options.deserializeSymbol
          ? options.deserializeSymbol(source.value)
          : Symbol(source.value)
        : isFunction(source)
          ? options.deserializeFunction
            ? options.deserializeFunction(source.value)
            : source.value
          : isBuiltInType(source)
            ? deserializeBuiltInType(source, alreadyDeserialized)
            : isArray(source)
              ? deserializeArray(source, alreadyDeserialized)
              : isObjectLiteral(source)
                ? deserializeObjectLiteral(source, alreadyDeserialized)
                : isCustomSerializedObject(source)
                  ? deserializeCustomSerializedObject(
                      source,
                      alreadyDeserialized
                    )
                  : isInstance(source)
                    ? deserializeInstance(source, alreadyDeserialized)
                    : isReference(source)
                      ? deserializeReference(source, alreadyDeserialized)
                      : exception(`Unable to serialize object ${source}.`);
    return result;
  }

  return (source: Serialized) => doDeserialize(source, []);
}
