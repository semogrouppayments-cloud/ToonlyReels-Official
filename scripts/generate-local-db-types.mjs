// Regenerate the checked-in contract from the local schema-test container.
// For a hosted project use: supabase gen types typescript --project-id YOUR_REF.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const container = process.env.SCHEMA_TEST_CONTAINER || 'toonly-schema-test';
const query = sql => JSON.parse(execFileSync('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', process.env.SCHEMA_TEST_DB || 'postgres', '-At', '-c', sql], {encoding:'utf8'}));
const columns=query(`SELECT json_agg(t) FROM (SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position)t`);
const enums=query(`SELECT json_object_agg(typname,labels) FROM (SELECT t.typname,json_agg(e.enumlabel ORDER BY e.enumsortorder) labels FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' GROUP BY t.typname)s`);
const relationships=query(`SELECT COALESCE(json_agg(s),'[]') FROM (SELECT con.conname AS name,cl.relname AS source,fr.relname AS target, array_agg(a.attname ORDER BY k.ord) AS columns,array_agg(af.attname ORDER BY k.ord) AS referenced_columns FROM pg_constraint con JOIN pg_class cl ON cl.oid=con.conrelid JOIN pg_namespace n ON n.oid=cl.relnamespace JOIN pg_class fr ON fr.oid=con.confrelid JOIN pg_namespace nf ON nf.oid=fr.relnamespace JOIN LATERAL unnest(con.conkey,con.confkey) WITH ORDINALITY k(src,dst,ord) ON true JOIN pg_attribute a ON a.attrelid=cl.oid AND a.attnum=k.src JOIN pg_attribute af ON af.attrelid=fr.oid AND af.attnum=k.dst WHERE con.contype='f' AND n.nspname='public' AND nf.nspname='public' GROUP BY con.conname,cl.relname,fr.relname)s`);
const functions=query(`SELECT json_agg(s) FROM (SELECT p.proname AS name, p.proargnames AS names, oidvectortypes(p.proargtypes) AS args, pg_get_function_result(p.oid) AS result FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype<>'trigger'::regtype ORDER BY p.proname)s`);
const type = value => {
 value=value.replaceAll('public.','');
 if(enums[value]) return `Database["public"]["Enums"]["${value}"]`;
 if(value.endsWith('[]') || value.startsWith('_')) return type(value.endsWith('[]')?value.slice(0,-2):value.slice(1))+'[]';
 if(['integer','int2','int4','int8','bigint','smallint','double precision','float8','numeric','real','float4'].includes(value))return 'number';
 if(['boolean','bool'].includes(value))return 'boolean';
 if(['json','jsonb'].includes(value))return 'Json';
 if(value==='void')return 'undefined';
 return 'string';
};
let source=`// Generated from the fresh-project PostgreSQL schema.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = {\n __InternalSupabase: { PostgrestVersion: "13.0.5" };\n public: {\n  Tables: {\n`;
for(const table of [...new Set(columns.map(c=>c.table_name))]) {
 const fields=columns.filter(c=>c.table_name===table);
 source+=`   ${table}: {\n`;
 for(const mode of ['Row','Insert','Update']) {
  source+=`    ${mode}: {\n`;
  for(const c of fields){const nullable=c.is_nullable==='YES';const optional=mode==='Update'||(mode==='Insert'&&(nullable||c.column_default!==null));source+=`     ${c.column_name}${optional?'?':''}: ${type(c.udt_name)}${nullable?' | null':''};\n`;}
  source+='    };\n';
 }
 source+='    Relationships: [\n';
 for(const r of relationships.filter(r=>r.source===table))source+=`     { foreignKeyName: ${JSON.stringify(r.name)}; columns: ${JSON.stringify(r.columns)}; isOneToOne: false; referencedRelation: ${JSON.stringify(r.target)}; referencedColumns: ${JSON.stringify(r.referenced_columns)} },\n`;
 source+='    ];\n   };\n';
}
source+='  };\n  Views: { [_ in never]: never };\n  Functions: {\n';
for(const f of functions) {
 const args=f.args?f.args.split(', '):[];
 let result;
 if(f.result.startsWith('TABLE(')) {
  const fields=f.result.slice(6,-1).split(', ').map(v=>{const space=v.indexOf(' ');return `${v.slice(0,space)}: ${type(v.slice(space+1))}`;}); result=`{ ${fields.join('; ')} }[]`;
 }else result=type(f.result);
 source+=`   ${f.name}: { Args: ${args.length?'{ '+args.map((t,i)=>`${f.names[i]}: ${type(t)}`).join('; ')+' }':'Record<PropertyKey, never>'}; Returns: ${result} };\n`;
}
source+='  };\n  Enums: {\n';for(const [name,values] of Object.entries(enums))source+=`   ${name}: ${values.map(v=>JSON.stringify(v)).join(' | ')};\n`;
source+='  };\n  CompositeTypes: { [_ in never]: never };\n };\n};\n';
const original=readFileSync('src/integrations/supabase/types.ts','utf8');
source+=original.slice(original.indexOf('type DatabaseWithoutInternals'));
// Keep enum runtime helpers in sync with the generated enum definitions.
const constants=source.indexOf('export const Constants');
if(constants>=0)source=source.slice(0,constants)+`export const Constants = { public: { Enums: ${JSON.stringify(enums,null,2)} } } as const;\n`;
writeFileSync('src/integrations/supabase/types.ts',source);
console.log(`Generated ${new Set(columns.map(c=>c.table_name)).size} table contracts.`);
