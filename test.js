const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const lodashID = require('lodash-id');
const uuid = require('uuid/v4');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({test: []}).write();
db.defaults({ok: {}}).write();
db._.mixin(lodashID);
db._.createId = () => uuid();

const created = db.get('test')
    .insert({title: 'news'})
    .write();

console.log('created', created);


const v = db.get('test')
    .value();
console.log(v);


//  // Set some defaults (required if your JSON file is empty)
//  db.defaults({ posts: [], user: {}, count: 0 })
//  .write()

//  // Add a post
//  db.get('posts')
//  .push({ id: 1, title: 'lowdb is awesome'})
//  .write()

//  // Set a user using Lodash shorthand syntax
//  db.set('user.name', 'typicode')
//  .write()

//  // Increment count
//  db.update('count', n => n + 1)
//  .write()
