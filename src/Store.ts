// @ts-ignore
import lodashID from 'lodash-id';
import low, {LowdbSync} from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import {Store} from 'origami-store-base';
import uuid from 'uuid/v4';
import path from 'path';
import LowDBModel from './Model';


module.exports = class LowDBStore extends Store {
    _connection?: LowdbSync<any>;
    _model: new(...args: any[]) => LowDBModel = LowDBModel;

    async connect() {
        this._connection = low(new FileSync(
            path.resolve(process.cwd(), this._options.database)
        ));
        this._connection._.mixin(lodashID);

        // @ts-ignore Added by lodashID mixin
        // Overrides the default ID creation to a UUID
        this._connection._.createId = () => uuid();
    }

    async disconnect() {
        // Nothing needed
        return true;
    }
};
