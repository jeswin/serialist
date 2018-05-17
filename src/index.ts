import deserialize, { IAlreadyDeserialized } from "./deserialize";
import serialize, { IAlreadySerialized } from "./serialize";

export interface ICtor<T> {
  new (...args: any[]): T;
}
export interface IConstructorAlias<T> {
  name?: string;
  ctor: ICtor<T>;
  serializer?: (
    source: any,
    alreadyDeserialized: IAlreadySerialized[],
    serialize: (
      source: any,
      alreadySerialized: IAlreadySerialized[]
    ) => Serialized
  ) => any;
  deserializer?: (
    val: any,
    source: Serialized,
    alreadyDeserialized: IAlreadyDeserialized[],
    deserialize: (
      source: Serialized,
      alreadyDeserialized: IAlreadyDeserialized[]
    ) => any
  ) => any;
}

export interface ISerializationOptions {
  serializeSymbol?: (val: symbol) => ICustomSerializedObject;
  serializeFunction?: (val: Function) => ICustomSerializedObject;
  deserializeSymbol?: (val: string) => any;
  deserializeFunction?: (val: string) => any;
}

export type Primitive = string | number | boolean | undefined | null;

export interface ISymbol {
  type: "symbol";
  value: string;
}

export interface IFunction {
  type: "function";
  value: string;
}

export enum SerializedTypes {
  Object,
  Special,
  Constructed,
  Custom,
  Array,
  Reference
}

export interface IObjectLiteral {
  type: "object";
  value: {
    [key: string]: any;
  };
  id?: number;
}

export interface IBuiltIn {
  type: "builtin";
  class: "Date" | "Map" | "Set" | "RegExp";
  value: any;
  id?: number;
}

export interface IInstance {
  type: "instance";
  class: string;
  props: {
    [key: string]: Serialized;
  };
  id?: number;
}

export interface ICustomSerializedObject {
  type: "custom";
  class: string;
  id?: number;
  value: any;
}

export interface IArray {
  type: "array";
  items: Serialized[];
  id?: number;
}

export interface IReference {
  type: "reference";
  id: number;
}

export type Serialized =
  | Primitive
  | ISymbol
  | IFunction
  | IObjectLiteral
  | IBuiltIn
  | IInstance
  | ICustomSerializedObject
  | IArray
  | IReference;

export function exception(message: string): never {
  throw new Error(message);
}

export default function(
  constructors?: Array<IConstructorAlias<any>>,
  options?: ISerializationOptions
) {
  const fnSerialize = serialize(constructors || [], options || {});
  const fnDeserialize = deserialize(constructors || [], options || {});
  return {
    deserialize: fnDeserialize,
    parse: (stringified: string) => fnDeserialize(JSON.parse(stringified)),
    serialize: fnSerialize,
    stringify: (source: any) => JSON.stringify(fnSerialize(source))
  };
}
