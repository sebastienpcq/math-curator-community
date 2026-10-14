'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {validateCatalog} = require('./schema.cjs');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname,'catalog.json'),'utf8'));
const errors=validateCatalog(catalog);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else {
 const discipline=process.argv[3];
 const resources=catalog.resources.filter(r=>!discipline||r.discipline===discipline);
 console.log('Knowledge Curator — '+resources.length+' ressource(s)');
 if(discipline && !catalog.disciplines.some(d=>d.id===discipline)){console.error('Discipline inconnue : '+discipline);process.exitCode=1;}
 for(const r of resources) console.log(r.title+' ['+r.level+'] — '+r.review.status+'\n'+r.url);
}
