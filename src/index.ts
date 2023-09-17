import { WrappexPlugin } from "wrappex/types/types";
import { Dexie } from "dexie";
import { runInAction } from "mobx";

const plugin: WrappexPlugin[number] = ({ db }: { db: Dexie }, args) => {
  const table = db.table(args.typename);
  return (obj) => {
    return {
      objectModification: {
        create: async () => {
          if (!obj.id) {
            const id = await table.add(obj);
            obj.id = id;
          }
        },
        getTable: () => table,
        populate: async () => {
          if (obj.id) {
            const dbObj = await table.get(obj.id);
            if (dbObj) {
              obj.disableUpdates();
              runInAction(() => {
                Object.keys(dbObj).forEach((key) => {
                  obj[key] = dbObj[key];
                });
              });
              obj.enableUpdates();
            }
          }
        },
        delete: async () => {
          if (obj.id) {
            await table.delete(obj.id);
            obj.dispose();
          }
        },
        checkIfExists: async (fields: string[]) => {
          const res = await table
            .where(
              fields.reduce((acc, field) => {
                acc[field] = obj[field];
                return acc;
              }, {} as Record<string, any>)
            )
            .count();
          return res === 1;
        },
        // update: async () => {},
      },
      reactionCallback: () => {},
    };
  };
};

export default plugin;
