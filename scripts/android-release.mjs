import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const required = ['TOONLY_RELEASE_STORE_FILE','TOONLY_RELEASE_STORE_PASSWORD','TOONLY_RELEASE_KEY_ALIAS','TOONLY_RELEASE_KEY_PASSWORD'];
if (required.some(name => !process.env[name]) || !existsSync(process.env.TOONLY_RELEASE_STORE_FILE || '')) {
  console.error('Release signing is not configured. Set the four TOONLY_RELEASE_* variables described in docs/ANDROID_BUILD_GUIDE.md.');
  process.exit(1);
}
for (const [command,args,cwd] of [['npm',['run','typecheck'],'.'],['npm',['run','android:sync'],'.'],[process.platform==='win32'?'gradlew.bat':'./gradlew',['assembleRelease','bundleRelease'],'android']]) {
  const result=spawnSync(command,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});
  if(result.status!==0)process.exit(result.status||1);
}
