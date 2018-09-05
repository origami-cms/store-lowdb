import {Resource} from 'origami-store-base';
import LowDBStore from './Store';
import _ from 'lodash';
import {AnyObject} from './Model';

export default class LowDBResource extends Resource {
    _store: LowDBStore;
    async save() {
        await this._store._connection.get(this._type)
            .updateWhere({id: this._originalResource.id}, this._properties)
            .write();
        return this;
    }

    async delete() {
        await this._store._connection.get(this._type)
            .updateWhere({id: this._originalResource.id}, {deletedAt: new Date()})
            .write();
        return null;
    }


    protected _convertTo(resource: object, opts: AnyObject) {
        let r = _.cloneDeep(resource);
        if (!opts.hidden) {
            r = this._store._connection._.pickBy(r, (v, k) => {
                return !this._hiddenFields.includes(k);
            });
        }
        // if (r.deletedAt === false) r.deletedAt = null;

        return r;
    }

    protected _convertNested(opts?: any) {
        Object.entries(this._linkedResources).forEach(([prop, resName]) => {
            const p = prop as keyof this;
            if (this[p] instanceof Array) {
                this[p] = this[p].map(r => new LowDBResource(resName, r, this._store, opts));
            }
            else this[p] = new LowDBResource(resName, this[p], this._store, opts);
        });
    }
}
