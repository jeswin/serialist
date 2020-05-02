import "mocha";
import "should";
import serialist, { IConstructorAlias } from "../";

const shouldLib = require("should");

enum ComparisonType {
  String,
  Number,
  Boolean,
  Undefined,
  Null,
  Symbol,
  Function,
  Instance,
  ObjectLiteral,
  Custom,
  Array,
  Date,
  Map,
  Set,
  RegExp
}

function withItem(
  itemType: string,
  item: any,
  comparison: ComparisonType,
  comparand: any,
  options?: { constructors?: IConstructorAlias<any>[] }
) {
  it(`serializes ${itemType}`, () => {
    const constructors = options ? options.constructors : undefined;
    const serializer = serialist(constructors);
    const result = serializer.serialize(item) as any;
    if (
      comparison === ComparisonType.String ||
      comparison === ComparisonType.Number ||
      comparison === ComparisonType.Boolean
    ) {
      result.should.equal(comparand);
    } else if (
      comparison === ComparisonType.Undefined ||
      comparison === ComparisonType.Null
    ) {
      shouldLib.not.exist(result);
      (result === comparand).should.be.true();
    } else if (comparison === ComparisonType.Function) {
      result.should.deepEqual({
        type: "function",
        value: comparand
      });
    } else if (comparison === ComparisonType.Symbol) {
      result.type.should.equal("symbol");
      result.value.should.equal(comparand);
    } else if (
      comparison === ComparisonType.ObjectLiteral ||
      comparison === ComparisonType.Instance ||
      comparison === ComparisonType.Array ||
      comparison === ComparisonType.Date
    ) {
      result.should.deepEqual(comparand);
    } else if (comparison === ComparisonType.Map) {
      result.type.should.equal("builtin");
      result.class.should.equal("Map");
      result.value.should.deepEqual(comparand);
    } else if (comparison === ComparisonType.Set) {
      result.type.should.equal("builtin");
      result.class.should.equal("Set");
      result.value.should.deepEqual(comparand);
    } else if (comparison === ComparisonType.RegExp) {
      result.type.should.equal("builtin");
      result.class.should.equal("RegExp");
      result.value.should.deepEqual(comparand);
    } else {
      throw new Error("Invalid comparison. Error in test script.");
    }
  });

  it(`deserializes ${itemType}`, () => {
    const constructors = options ? options.constructors : undefined;
    const serializer = serialist(constructors);
    const serialized = serializer.serialize(item);
    const result = serializer.deserialize(serialized) as any;
    if (
      comparison === ComparisonType.String ||
      comparison === ComparisonType.Number ||
      comparison === ComparisonType.Boolean
    ) {
      result.should.equal(item);
    } else if (
      comparison === ComparisonType.Undefined ||
      comparison === ComparisonType.Null
    ) {
      shouldLib.not.exist(result);
      (result === comparand).should.be.true();
    } else if (comparison === ComparisonType.Function) {
      result.should.equal(comparand);
    } else if (comparison === ComparisonType.Symbol) {
      result.toString().should.equal("Symbol(x)");
    } else if (
      comparison === ComparisonType.ObjectLiteral ||
      comparison === ComparisonType.Array ||
      comparison === ComparisonType.Date
    ) {
      result.should.deepEqual(item);
    } else if (
      comparison === ComparisonType.Map ||
      comparison === ComparisonType.Set ||
      comparison === ComparisonType.RegExp
    ) {
      result.should.deepEqual(item);
    } else if (comparison === ComparisonType.Instance) {
      result.constructor.should.equal(item.constructor);
      result.should.deepEqual(item);
    } else {
      throw new Error("Invalid comparison. Error in test script.");
    }
  });
}

describe("serialist", () => {
  withItem("string", "hello", ComparisonType.String, "hello");

  withItem("number", 10, ComparisonType.Number, 10);

  withItem("boolean", true, ComparisonType.Boolean, true);

  withItem("undefined", undefined, ComparisonType.Undefined, undefined);

  withItem("null", null, ComparisonType.Null, null);

  {
    const item = Symbol("x");
    withItem("symbol", item, ComparisonType.Symbol, "x");
  }

  {
    function hello() {}
    withItem("function", hello, ComparisonType.Function, "hello");
  }

  withItem("literal object", { x: 10, y: 20 }, ComparisonType.ObjectLiteral, {
    type: "object",
    value: { x: 10, y: 20 }
  });

  withItem("primitive array", [1, 2, 3, 4], ComparisonType.Array, {
    items: [1, 2, 3, 4],
    type: "array"
  });

  withItem(
    "builtin Date",
    new Date("Sat May 12 2018 16:25:22 GMT+0530 (IST)"),
    ComparisonType.Date,
    {
      class: "Date",
      type: "builtin",
      value: "Sat May 12 2018 16:25:22 GMT+0530 (India Standard Time)"
    }
  );

  {
    const pairs: [number, string][] = [[1, "one"], [2, "two"]];
    const map = new Map<number, string>(pairs);
    withItem("builtin Map", map, ComparisonType.Map, [[1, "one"], [2, "two"]]);
  }

  {
    const values: number[] = [1, 2, 3, 4];
    const set = new Set<number>(values);
    withItem("builtin Set", set, ComparisonType.Set, [1, 2, 3, 4]);
  }

  {
    const regex = /abcd/;
    withItem("builtin RegExp", regex, ComparisonType.RegExp, "abcd");
  }

  withItem(
    "nested literal object",
    { x: 10, y: 20, z: { x: 100, y: 200 } },
    ComparisonType.ObjectLiteral,
    {
      type: "object",
      value: {
        x: 10,
        y: 20,
        z: {
          type: "object",
          value: { x: 100, y: 200 }
        }
      }
    }
  );

  {
    class Human {
      name: string;
      age: number;
      constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
      }
    }
    withItem(
      "instance",
      new Human("Jeswin", 37),
      ComparisonType.Instance,
      {
        class: "Human",
        props: { name: "Jeswin", age: 37 },
        type: "instance"
      },
      {
        constructors: [
          {
            ctor: Human,
            name: "Human"
          }
        ]
      }
    );
  }

  {
    class Human {
      name: string;
      age: number;
      constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
      }
    }

    withItem(
      "array of constructed objects",
      [new Human("Jeswin", 37), new Human("Deepa", 39)],
      ComparisonType.Array,
      {
        items: [
          {
            class: "Human",
            props: { name: "Jeswin", age: 37 },
            type: "instance"
          },
          {
            class: "Human",
            props: { name: "Deepa", age: 39 },
            type: "instance"
          }
        ],
        type: "array"
      },
      {
        constructors: [
          {
            ctor: Human,
            name: "Human"
          }
        ]
      }
    );
  }

  {
    class Human {
      name: string;
      age: number;
      constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
      }
    }

    class Group {
      name: string;
      humans: Human[];
      constructor(name: string, humans: Human[]) {
        this.name = name;
        this.humans = humans;
      }
    }

    const item = new Group("dwellers", [
      new Human("Jeswin", 37),
      new Human("Deepa", 39)
    ]);

    withItem(
      "nested constructed object",
      item,
      ComparisonType.Instance,
      {
        class: "Group",
        props: {
          humans: {
            items: [
              {
                class: "Human",
                props: { name: "Jeswin", age: 37 },
                type: "instance"
              },
              {
                class: "Human",
                props: { name: "Deepa", age: 39 },
                type: "instance"
              }
            ],
            type: "array"
          },
          name: "dwellers"
        },
        type: "instance"
      },
      {
        constructors: [{ ctor: Human }, { ctor: Group }]
      }
    );
  }

  {
    const item1: any = { x: 10, y: 20 };
    item1.circular = item1;
    withItem("circular literal object", item1, ComparisonType.ObjectLiteral, {
      id: 0,
      type: "object",
      value: {
        circular: {
          id: 0,
          type: "reference"
        },
        x: 10,
        y: 20
      }
    });
  }

  {
    const item1: any = { x: 10, y: 20 };
    const item2: any = { p: 100, q: 200 };
    item1.i = item2;
    item2.i = item1;
    withItem(
      "circular cross-referencing literal object",
      item1,
      ComparisonType.ObjectLiteral,
      {
        id: 0,
        type: "object",
        value: {
          i: {
            type: "object",
            value: { p: 100, q: 200, i: { type: "reference", id: 0 } }
          },
          x: 10,
          y: 20
        }
      }
    );
  }

  {
    const item1: any = { x: 10, y: 20, c: { p: 100 } };
    item1.circular = item1;
    item1.c.circular = item1;
    item1.d = item1.c;
    withItem(
      "deeply nested circular literal objects",
      item1,
      ComparisonType.ObjectLiteral,
      {
        id: 0,
        type: "object",
        value: {
          c: {
            id: 1,
            type: "object",
            value: { p: 100, circular: { type: "reference", id: 0 } }
          },
          circular: { type: "reference", id: 0 },
          d: { type: "reference", id: 1 },
          x: 10,
          y: 20
        }
      }
    );
  }

  {
    const item1: any = { x: 10, y: 20 };
    const item2: any = { p: 100, q: 200 };
    item1.i = item2;
    item2.i = item1;
    withItem(
      "circular cross-referencing literal objects in array",
      [item1, item2],
      ComparisonType.ObjectLiteral,
      {
        items: [
          {
            id: 0,
            type: "object",
            value: {
              i: {
                id: 1,
                type: "object",
                value: { p: 100, q: 200, i: { type: "reference", id: 0 } }
              },
              x: 10,
              y: 20
            }
          },
          { type: "reference", id: 1 }
        ],
        type: "array"
      }
    );
  }

  {
    class Human {
      name: string;
      age: number;
      bestie?: Human;
      constructor(name: string, age: number, bestie?: Human) {
        this.name = name;
        this.age = age;
        this.bestie = bestie;
      }
    }

    const jeswin = new Human("Jeswin", 37);
    const deepa = new Human("Deepa", 39, jeswin);
    jeswin.bestie = deepa;

    withItem(
      "circular constructed object",
      jeswin,
      ComparisonType.Instance,
      {
        class: "Human",
        id: 0,
        props: {
          age: 37,
          bestie: {
            class: "Human",
            props: {
              age: 39,
              bestie: { type: "reference", id: 0 },
              name: "Deepa"
            },
            type: "instance"
          },
          name: "Jeswin"
        },
        type: "instance"
      },
      {
        constructors: [
          {
            ctor: Human,
            name: "Human"
          }
        ]
      }
    );
  }

  {
    class Human {
      name: string;
      age: number;
      constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
      }
    }
    withItem(
      "constructed object with custom ctor name",
      new Human("Jeswin", 37),
      ComparisonType.Instance,
      {
        class: "CLS_HUMAN",
        props: { name: "Jeswin", age: 37 },
        type: "instance"
      },
      { constructors: [{ name: "CLS_HUMAN", ctor: Human }] }
    );
  }

  {
    class Human {
      name: string;
      age: number;
      constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
      }
    }
    withItem(
      "constructed object with custom serializer",
      new Human("Jeswin", 37),
      ComparisonType.Instance,
      {
        class: "CLS_HUMAN",
        type: "custom",
        value: "Jeswin:37"
      },
      {
        constructors: [
          {
            ctor: Human,
            deserializer: item => {
              const [name, age] = item.split(":");
              return new Human(name, parseInt(age, 10));
            },
            name: "CLS_HUMAN",
            serializer: human => `${human.name}:${human.age}`
          }
        ]
      }
    );
  }

  {
    it("custom deserializes a symbol", () => {
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

      const serializer = serialist([], options);

      // convert item to a string
      const stringItem = serializer.stringify(item);

      // get the original item back
      const originalItem = serializer.parse(stringItem);

      originalItem.should.deepEqual(item);
    });
  }

  {
    it("custom deserializes a function", () => {
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
      originalItem.should.deepEqual(item);
    });
  }

  {
    it("custom deserializes a builtin Int8Array", () => {
      const item = new Int8Array([0, 1, 2, 3]);

      const constructors: IConstructorAlias<any>[] = [
        {
          ctor: Int8Array,
          deserializer: src => new Int8Array(src),
          serializer: arr => Array.from(arr)
        }
      ];

      const serializer = serialist(constructors);

      // convert item to a string
      const stringItem = serializer.stringify(item);

      // get the original item back
      const originalItem = serializer.parse(stringItem);

      originalItem.should.deepEqual(item);
    });
  }

  {
    it("custom deserializes a nested object", () => {
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

      originalItem.should.deepEqual(objHuman);
    });
  }
});
