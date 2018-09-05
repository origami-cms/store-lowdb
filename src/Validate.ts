import {AnyObject} from './Model';
import {ValidationMessages} from 'origami-store-base/build/Model';

type DontValidate = 'unknown' | 'duplicate';
type Rules = {
    [rule in Exclude<ValidationMessages, DontValidate>]:
        (resource: AnyObject, field: string, opts?: any) => boolean;
};

export default {
    required: (r, f) => r[f] !== null && r[f] !== undefined && r[f] !== '',
    minlength: (r, f, o: number) => {
        if (!r[f]) return false;
        return r[f].length > o;
    },
    maxlength: (r, f, o: number) => {
        if (!r[f]) return false;
        r[f].length < o;
    },
    min: (r, f, o: number) => r[f] > o,
    max: (r, f, o: number) => r[f] < o
} as Rules;
