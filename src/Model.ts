import low from 'lowdb';
import {Origami} from 'origami-core-lib';
import {Model} from 'origami-store-base';
import Resource from './Resource';
import uuid from 'uuid/v4';
import LowDBStore from './Store';
import ValidationRules from './validate';
import _ from 'lodash';

export type AnyObject = {[key: string]: any};
type ValidateOptions = {
    new?: boolean;
};

export default class LowDBModel extends Model {
    constructor(name: string, schema: Origami.Store.Schema, public store: LowDBStore) {
        super(name, schema, store);
        store._connection!.defaults({[name]: []}).write();
    }

    private get _db() {
        return this.store._connection;
    }

    private get _model() {
        return this._db.get(this.name);
    }

    protected async _create(resource: AnyObject, options?: object) {

        const clone = this._addDefaults(resource);
        await this._validate(clone, {new: true});

        const res = this.store._connection.get(this.name)
            .insert(clone)
            .write();

        return new Resource(
            this.name,
            res,
            this.store,
            options
        );
    }


    protected async _find(
        query: object,
        options?: AnyObject
    ): Promise<Resource[]> {
        query.deletedAt = null;

        const func = this._model.filter(query).value();

        // func = this._populateQuery(func, options);

        return (func).map(r => new Resource(this.name, r, this.store, options));
    }


    protected async _findOne(query: object, options?: object): Promise<Resource | null> {
        query.deletedAt = null;

        const [res] = this._model.filter(query).take(1).value();

        if (!res) return null;
        return new Resource(this.name, res, this.store, options);
    }


    protected async _update(
        query: object,
        newResource: { [key: string]: any },
        options?: any
    ): Promise<Resource[]> {
        let res;
        if (options.upsert) {
            const clone = this._addDefaults({...query, ...newResource});
            await this._validate(clone, {new: true});

            res = this.store._connection.get(this.name)
                .upsert(clone)
                .write();
            res = [res];

        } else {
            res = this.store._connection.get(this.name)
                .updateWhere(query, newResource)
                .write();
        }

        return res.map(r => new Resource(this.name, r, this.store, options));
    }


    protected _schemaFrom(schema: Origami.Store.Schema) {
        const cloned = _.cloneDeep(schema);
        const parsed: { [key: string]: any } = {};

        Object.entries(cloned.properties).forEach(([pName, prop]) => {
            const isA = Boolean(prop.isA);
            const isMany = Boolean(prop.isMany);

            let p = prop;
            let name = pName;

            if (typeof p === 'string' || p instanceof Array) p = {type: p};
            if (name === 'id') name = '_id';

            if (isA) {
                p.ref = p.isA;
                delete p.isA;
                p.type = 'uuid';
            }
            if (isMany) {
                p.ref = p.isMany;
                delete p.isMany;
                p.type = 'uuid';
            }

            if (p.type instanceof Array) {
                // p.type = mongoose.Schema.Types.Mixed;
            } else {
                switch (p.type) {
                    case 'email':
                        p.type = String;
                        break;
                    case 'uuid':
                        p.type = String;
                        if (!p.default) p.default = () => uuid();
                        break;
                }
            }

            if (isMany) p = [p];

            parsed[name] = p;
        });

        parsed.createdAt = {type: Date, required: true, default: Date.now};
        parsed.updatedAt = Date;
        parsed.deletedAt = Date;

        return parsed;
    }


    private _addValidators() {
        Object.entries(this._mSchema.obj).forEach(([name, prop]: [string, any]) => {
            // Validate {ref: 'xxx'} by looking up the model,
            // and finding the resource with that ID
            if (prop.ref) {
                const parent = prop.ref;
                const singularP = singular(parent);
                const upper = singularP[0].toUpperCase() + singularP.slice(1);

                this._mSchema.path(name).validate(
                    (id: string) => mongoose.models[parent].findById(id),
                    `${upper} does not exist with that ID`
                );
            }
        });
    }


    private _populateQuery(func: mongoose.DocumentQuery<any, any>, options: any) {
        let f = func;

        if (options && options.include) {
            let include: string[] = [];
            if (typeof options.include === 'string') include = [options.include];
            else if (options.include instanceof Array) include = options.include;

            include.forEach(field => {
                f = f.populate(field);
            });
            if (include.length) f = f.exec();
        }

        return func;
    }

    private _addDefaults(resource: AnyObject) {
        const res = _.cloneDeep(resource);

        Object.entries(this.schema.properties).forEach(([name, prop]) => {
            if (res[name] === undefined && prop.default) {
                res[name] = (typeof prop === 'function')
                    ? prop.default()
                    : prop.default;
            }
        });
        res.createdAt = new Date();
        res.updatedAt = new Date();
        res.deletedAt = null;
        return res;
    }

    private async _validate(resource: AnyObject, opts: ValidateOptions) {
        // Validate unique fields
        const s = this._schemaFrom(this.schema);


        // Loop over validation rules, and dynamically throw errors with messages
        Object.entries(ValidationRules).forEach(([rule, func]) => {
            const toValidateFields = Object.entries(_.pickBy(s, v => v[rule] !== undefined));

            toValidateFields.forEach(([f, v]) => {
                if (!func(resource, f, v[rule])) {
                    if (v.required || resource[f]) {
                        this._validationError(
                            this._validateMessages[rule](f, resource[f], v[rule]),
                            f,
                            rule
                        );
                    }
                }
            });
        });

        const uniqueFields = Object.keys(_.pickBy(s, v => v.unique));
        const unqPromises = uniqueFields.map(async f => {
            const existing = await this._findOne({[f]: resource[f]});
            if (existing) {
                this._validationError(
                    this._validateMessages.duplicate(f),
                    f,
                    'duplicate'
                );
            }
        });

        await Promise.all(unqPromises);
    }
}
