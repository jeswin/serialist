# serialist

Serialist is a custom serialization library for JS with a focus on extensibility.

```
npm install serialist
```

## Features

* Circular References
* Handles Date, Function, Set, Map, RegExp objects
* Custom Serialization
* Extensible, if a builtin is not yet handled by the library

## Usage

Serializing a JS primitive (bool, string, etc)

```js
import serialist from "serialist";
const serializer = serialist();

const item = 10;

// convert item to a string
const stringItem = serializer.stringify(item);

// get the original item back
const originalItem = serializer.parse(stringItem);
```

Serializing and deserializing an object literal.

```js
const serializer = serialist();
const item = { x: 10, y: 20, today: new Date() };

// convert item to a string
const stringItem = serializer.stringify(item);

// get the original item back
const originalItem = serializer.parse(stringItem);
```

## Serializing Custom Classes

By itself, serialist cannot serialize or deserialize objects with a custom constructor. You have to provide a set of constructors to serialist so that it can serialize or deserialize them.

See below.

```js
// define the constructors you want to serialize
const constructors = [
  { ctor: Human },
  { ctor: Group }
];
const serializer = serialist(constructors);

const human = new Human();
const group = new Group();
human.group = group;

serializer.stringify(human, { constructors });
```

There's a small problem though. If you have multiple classes with the same name, the deserializer won't be able to differentiate between them. So, optionally specify a name to each constructor.

```js
serializer.stringify(human, {
  constructors: [
    { name: "CLS_HUMAN1", ctor: abc.Human },
    { name: "CLS_HUMAN2", ctor: xyz.Human }
  ]
});
```

## Serializing Symbols

Symbols cannot be deserialized due to them being not reproducible during deserialization. But since your app can see the symbols created, the app can take over symbol deserialization by registering a callback.

```js
const sym = Symbol("x");
const item = { a: 10, sym };

const options = {
  deserializeSymbol(identifier: string) {
    if (identifier === "x") {
      return sym;
    }
    throw new Error("Unknown symbol " + identifier);
  }
};

// first param is the constructor list. Pass empty array.
const serializer = serialist([], options);

// convert item to a string
const stringItem = serializer.stringify(item);

// get the original item back
const originalItem = serializer.parse(stringItem);
```

## Serializing Functions

Serialist does not attempt to deserialize functions, since that would involve an eval() which is a potential security issue. However, you may implement a custom deserializer for functions.

```js
function greet() {
  return "hello world";
}

const item = { a: 10, greet };

const options = {
  deserializeFunction(functionName: string) {
    if (functionName === "greet") {
      return greet;
    }
    throw new Error("Unknown function " + functionName);
  }
};

const serializer = serialist([], options);

// convert item to a string
const stringItem = serializer.stringify(item);

// get the original item back
const originalItem = serializer.parse(stringItem);
```

## Custom Serialization

You can also choose to do custom serialization and deserialization for an object of a specific type. For this, define a serializer and deserializer for a constructor.

In the following example we define a custom serializer and deserializer for the Human class.

```js
class Human {
  name: string;
  age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

const constructors = [
  {
    ctor: Human,
    deserializer: item => {
      const [name, age] = item.value.split(":");
      return new Human(name, parseInt(age, 10));
    },
    name: "CLS_HUMAN",
    serializer: human => `${human.name}:${human.age}`
  }
];

const serializer = serialist(constructors);

const human = new Human("Jeswin", 37);

/*
  returns the string:
  {
    "class": "CLS_HUMAN",
    "type": "custom",
    "value": "Jeswin:37"
  }
*/
const stringHuman = serializer.stringify(human);

// Get the human back
const original = serializer.deserialize(stringHuman);
```

## Serialization of unhandled built-ins like Int8Array, SIMD.Float32x4 etc

You can use Custom Serialization to handle builtins which aren't intrinsically handled by serialist. For instance, here's an example in which we serialize an Int8Array instance.

```js
const item = new Int8Array([0, 1, 2, 3]);

const constructors: IConstructorAlias<any>[] = [
  {
    ctor: Int8Array,
    deserializer: src => new Int8Array(src.value),
    serializer: arr => Array.from(arr)
  }
];

const serializer = serialist(constructors);

// convert item to a string
const stringItem = serializer.stringify(item);

// get the original item back
const originalItem = serializer.parse(stringItem);
```

## Using serialist within custom serialization and deserialization (Advanced)

Sometimes, you would want to serialize and deserialize an object, but not manually handle some of the nested properties. Custom serialize() and deserialize() functions have an additional parameter which holds a reference to the serializer or deserializer which could be used to handle nested properties.

Remember to add the newly deserialized object to the alreadyDeserialized array while deserializing. The alreadyDeserialized array contains objects with the structure { source, result }, where source is the raw serialized object that was passed in and result is the new object that was just created.

```js
class Human {
  name: string;
  age: number;
  meta?: any;
  constructor(name: string, age: number, meta?: any) {
    this.name = name;
    this.age = age;
    this.meta = meta;
  }
}

const objHuman = new Human("Jeswin", 37, { location: "INDIA" });

const constructors = [
  {
    ctor: Human,
    deserializer: (
      value: any,
      source: any,
      alreadyDeserialized: any,
      deserialize: any
    ) => {
      const newHuman = new Human(value.name, value.age);
      alreadyDeserialized.push({ source, result: newHuman });
      newHuman.meta = deserialize(value.meta, alreadyDeserialized);
      return newHuman;
    },
    name: "CLS_HUMAN",
    serializer: (
      human: any,
      alreadySerialized: any[],
      serialize: any
    ) => ({
      age: human.age,
      meta: serialize(human.meta, alreadySerialized),
      name: human.name
    })
  }
];

const serializer = serialist(constructors);

// convert item to a string
const stringItem = serializer.stringify(objHuman);

// get the original item back
const originalItem = serializer.parse(stringItem);
```
