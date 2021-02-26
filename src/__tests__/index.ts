import "jest";
import wrappex from "wrappex";
import Dexie from "dexie";
// @ts-ignore
import indexedDB from "fake-indexeddb";
// @ts-ignore
import keyrange from "fake-indexeddb/lib/FDBKeyRange";
import plugin from "../index";

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = keyrange;
type ForeignTest = { id: number; c: number };

type Test = { id: number; a: number; b: string; c: number };

describe("local plugin works", () => {
  const db = new Dexie("test");
  db.version(1).stores({ Test: "++id, a, b", ForeignTest: "++id, c" });
  const plugged = wrappex([plugin]);
  const foreignFactory = plugged({
    typename: "ForeignTest",
    init: {} as ForeignTest,
    fields: ["c"],
    db,
  });
  const factory = plugged({
    typename: "Test",
    init: {} as Test,
    fields: ["a", "b", "c"],
    db,
    modifier: {
      getC: (obj: any, ctx: any) => {
        return foreignFactory({ id: obj.c });
      },
    },
  });
  it("create works if id does not exist", async (d) => {
    const obj = factory({});
    await obj.create();
    expect(obj.id).toEqual(1);
    d();
  });
  it("create works if id exists", async (d) => {
    const obj = factory({ id: 5 });
    await obj.create();
    expect(obj.id).toEqual(5);
    d();
  });
  it("populate works if record exists", async (d) => {
    const id = await db.table("Test").add({ a: 1, b: "string" });
    const obj = factory({ id: +id });
    expect(obj.id).toEqual(id);
    expect(obj.a).toEqual(undefined);
    expect(obj.b).toEqual(undefined);
    await obj.populate();
    expect(obj.a).toEqual(1);
    expect(obj.b).toEqual("string");
    d();
  });
  it("populate works if record does not exist", async (d) => {
    const obj = factory({ id: 6 });
    expect(obj.id).toEqual(6);
    expect(obj.a).toEqual(undefined);
    expect(obj.b).toEqual(undefined);
    await obj.populate();
    expect(obj.a).toEqual(undefined);
    expect(obj.b).toEqual(undefined);
    d();
  });
  it("populate works if id does not exist", async (d) => {
    const obj = factory({});
    expect(obj.id).toEqual(undefined);
    expect(obj.a).toEqual(undefined);
    expect(obj.b).toEqual(undefined);
    await obj.populate();
    expect(obj.a).toEqual(undefined);
    expect(obj.b).toEqual(undefined);
    d();
  });
  it("delete works if id exists", async (d) => {
    const id = await db.table("Test").add({ a: 1, b: "string" });
    const obj = factory({ id: +id });
    await obj.delete();
    expect(await db.table("Test").get(id)).toBeUndefined();
    d();
  });
  it("delete works if id does not exist", async (d) => {
    const obj = factory({});
    await obj.delete();
    d();
  });
  it("check if exists works", async (d) => {
    await db.table("Test").add({ a: 2, b: "string" });
    const obj = factory({ a: 1, b: "string" });
    expect(await obj.checkIfExists(["a", "b"])).toEqual(true);
    d();
  });
  it("modifier works", async (d) => {
    const id = await db.table("ForeignTest").add({ c: 13 });
    const obj = factory({ c: +id });
    expect(obj.c).toEqual({ id });
    await obj.c.populate();
    expect(obj.c).toEqual({ id, c: 13 });
    d();
  });
  it("getTable works", () => {
    const obj = factory({});
    expect(obj.getTable().add).toBeDefined();
  });
});
