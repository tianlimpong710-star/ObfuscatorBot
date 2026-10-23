const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    AttachmentBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs');
const crypto = require('crypto');

// --- CONFIGURATION ---
const TOKEN = process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN_HERE";
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID_HERE";
const PRIMARY_OWNER_ID = "123456789012345678"; // Replace with your main Discord User ID

const ALLOWED_ROLE_IDS = [
    "1552940976236929024",
    "1552940976165888039",
    "1552940976165888037"
];

const PREMIUM_ROLE_ID = "1559111360615284806"; // Premium Role ID
const DATA_FILE = "bot_data.json";
const MAX_CREDITS = 999999999999999999999999999999999999999999999999999999; // Maximum safe credit cap to prevent Infinity/null bugs

// --- DATABASE HELPERS ---
function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        return { users: {}, blacklist: [] };
    }
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!data.users) data.users = {};
        if (!data.blacklist) data.blacklist = [];
        
        // Sanitize existing user credits to prevent null/Infinity issues
        for (const userId in data.users) {
            if (data.users[userId].credits === null || isNaN(data.users[userId].credits) || !isFinite(data.users[userId].credits)) {
                data.users[userId].credits = 0;
            } else if (data.users[userId].credits > MAX_CREDITS) {
                data.users[userId].credits = MAX_CREDITS;
            }
        }
        return data;
    } catch (e) {
        return { users: {}, blacklist: [] };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

function getUser(userId) {
    const data = loadData();
    if (!data.users[userId] || data.users[userId].credits === null || isNaN(data.users[userId].credits)) {
        data.users[userId] = { credits: 10, last_daily: 0 };
        saveData(data);
    }
    return data;
}

// --- OWNER & ROLE CHECK ---
function hasOwnerOrRole(member) {
    if (!member) return false;
    if (member.id === PRIMARY_OWNER_ID) return true;
    return member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
}

/* -------------------------------------------------------------------------- */
/*  COMBINED + COMPACTED ANTI-TAMPER (runs first)                             */
/* -------------------------------------------------------------------------- */
const ANTITAMPER_BODY = `local function a(r)while true do r=r end end;local function b(v,r)if not v then a(r)end end;local function c(v)if type(v)~="string"then return v end;return(string.gsub(v," to '[^']+'",""))end;local function d(ok,act,exp,r)b(ok==false,r..":status");b(c(act)==c(exp),r..":error")end;local function e(ok,act,exp,r)b(ok==false,r..":status");local at,et=c(act),c(exp);b(type(at)=="string"and string.sub(at,-#et)==et,r..":error")end
local function f()local refs={assert=assert,error=error,getmetatable=getmetatable,next=next,pairs=pairs,pcall=pcall,rawequal=rawequal,rawget=rawget,rawset=rawset,select=select,setmetatable=setmetatable,tonumber=tonumber,tostring=tostring,type=type,xpcall=xpcall,stringByte=string.byte,stringChar=string.char,stringSub=string.sub,tableInsert=table.insert,tableRemove=table.remove,mathFloor=math.floor,coroutineResume=coroutine.resume,debugInfo=debug.info,taskSpawn=task.spawn,loadstring=loadstring,instanceNew=Instance.new,typeof=typeof,buffer=buffer,b1=buffer.create,b2=buffer.fromstring,b3=buffer.tostring,b4=buffer.len,b5=buffer.readi8,b6=buffer.readu8,b7=buffer.readi16,b8=buffer.readu16,b9=buffer.readi32,b10=buffer.readu32,b11=buffer.readf32,b12=buffer.readf64,b13=buffer.readstring,b14=buffer.writei8,b15=buffer.writeu8,b16=buffer.writei16,b17=buffer.writeu16,b18=buffer.writei32,b19=buffer.writeu32,b20=buffer.writef32,b21=buffer.writef64,b22=buffer.writestring,b23=buffer.copy,b24=buffer.fill,b25=buffer.readbits,b26=buffer.writebits}
if type(getfenv)=="function"then local function v1()return v end;local ok,env=pcall(getfenv,v1);b(ok and type(env)=="table",1);if type(setfenv)=="function"then local v2={}local t15=setmetatable({v=v2},{__index=env});local ok2,v21=pcall(setfenv,v1,t15);b(ok2 and v21==v1,2);b(v1()==v2,3);b(pcall(setfenv,v1,env),4)end end
local s1="test";local ok1,s2=pcall(function()error(s1,0)end);b(not ok1 and type(s2)=="string"and string.find(s2,s1,1,true)~=nil,5);local handled,s4=xpcall(function()error(s1,0)end,function(m)return"handled:"..tostring(m)end);b(not handled and type(s4)=="string"and string.find(s4,"handled:",1,true)==1 and string.find(s4,s1,1,true)~=nil,6)
local function f1(...)return select("#",...),...end;local count,first,second,third=f1("head",nil,"tail");b(count==3 and first=="head"and second==nil and third=="tail",7);local function f2()return 17,nil,29 end;local returnCount=select("#",f2());local returnFirst,returnSecond,returnThird=f2();b(returnCount==3 and returnFirst==17 and returnSecond==nil and returnThird==29,8)
local closures={};for i=1,3 do local captured=i;closures[i]=function(inc)captured=captured+inc;return captured end end;b(closures[1](4)==5 and closures[1](2)==7 and closures[2](3)==5 and closures[3](1)==4,9)
local writes={};local mt={__index=function(_,k)return"index:"..tostring(k)end,__newindex=function(_,k,v)writes[k]=v end,__add=function(l,r)return rawget(l,"value")+rawget(r,"value")end,__tostring=function()return"object"end};local left=setmetatable({value=13},mt);local right=setmetatable({value=7},mt);b(left.missing=="index:missing",10);left.recorded=41;b(writes.recorded==41,11);b(left+right==20,12);b(tostring(left)=="object"and getmetatable(left)==mt,13);rawset(left,"raw",53);b(rawget(left,"raw")==53 and rawequal(left,left)and not rawequal(left,right),14)
local values={4,1,3};table.insert(values,2,2);b(table.concat(values,",")=="4,2,1,3",15);b(table.remove(values,1)==4,16);table.sort(values);b(table.concat(values,",")=="1,2,3",17);local pairCount=0;for k,v in pairs({alpha=1,beta=2})do b((k=="alpha"and v==1)or(k=="beta"and v==2),18);pairCount=pairCount+1 end;b(pairCount==2,19);local arrayCount=0;for i,v in ipairs({3,5,7})do b(v==i*2+1,20);arrayCount=arrayCount+1 end;b(arrayCount==3,21)
local binary="A\\0z";b(string.byte(binary,1)==65 and string.byte(binary,2)==0 and string.byte(binary,3)==122,22);b(string.char(65,0,122)==binary,23);b(string.sub("abcdef",2,-2)=="bcde",24);b(string.reverse("abc\\0")=="\\0cba",25);b(string.rep("xy",3)=="xyxyxy"and #"a\\0b"==3 and string.format("%02x:%s",15,"ok")=="0f:ok",26)
b(tonumber("ff",16)==255 and math.floor(-1.25)==-2 and math.abs(-17)==17 and math.min(9,3,7)==3 and math.max(9,3,7)==9,27);local nan=0/0;b(math.huge>1e308 and nan~=nan and(-17%5)==3,28)
b(type(bit32)=="table",29);b(bit32.bxor(0x55AA55AA,0x0F0F0F0F)==0x5AA55AA5 and bit32.band(0x12345678,0x00FF00FF)==0x00340078 and bit32.bor(0x12003478,0x00345600)==0x12347678 and bit32.lrotate(0x12345678,8)==0x34567812 and bit32.rshift(0x80000000,31)==1,30)
local t16={{"create",refs.b1},{"fromstring",refs.b2},{"tostring",refs.b3},{"len",refs.b4},{"readi8",refs.b5},{"readu8",refs.b6},{"readi16",refs.b7},{"readu16",refs.b8},{"readi32",refs.b9},{"readu32",refs.b10},{"readf32",refs.b11},{"readf64",refs.b12},{"readstring",refs.b13},{"writei8",refs.b14},{"writeu8",refs.b15},{"writei16",refs.b16},{"writeu16",refs.b17},{"writei32",refs.b18},{"writeu32",refs.b19},{"writef32",refs.b20},{"writef64",refs.b21},{"writestring",refs.b22},{"copy",refs.b23},{"fill",refs.b24},{"readbits",refs.b25},{"writebits",refs.b26}};for i,t in ipairs(t16)do local fn=t[2];local source,line,name,parameters,variadic,v23=debug.info(fn,"slnaf");b(type(fn)=="function"and source=="[C]"and line==-1 and name==t[1]and parameters==0 and variadic==true and v23==fn and iscclosure(fn)==true and islclosure(fn)==false,49+i)end
local s5=string.char(0,1,127,128,255,65,0,90);local v24=refs.b2(s5);b(type(v24)=="buffer"and typeof(v24)=="buffer"and refs.b4(v24)==#s5 and refs.b3(v24)==s5,76)
local v25=refs.b1(48);b(type(v25)=="buffer"and refs.b4(v25)==48 and refs.b3(v25)==string.rep("\\0",48),77);refs.b14(v25,0,-128);refs.b15(v25,1,255);refs.b16(v25,2,-12345);refs.b17(v25,4,0xFEDC);refs.b18(v25,6,-123456789);refs.b19(v25,10,0xDEADBEEF);refs.b20(v25,14,1.25);refs.b21(v25,18,-1234.5);refs.b22(v25,26,"A\\0z");b(refs.b5(v25,0)==-128 and refs.b6(v25,1)==255 and refs.b7(v25,2)==-12345 and refs.b8(v25,4)==0xFEDC and refs.b9(v25,6)==-123456789 and refs.b10(v25,10)==0xDEADBEEF and refs.b11(v25,14)==1.25 and refs.b12(v25,18)==-1234.5 and refs.b13(v25,26,3)=="A\\0z",78)
local v26=refs.b1(6);refs.b17(v26,0,0x1234);refs.b19(v26,2,0x89ABCDEF);b(refs.b3(v26)==string.char(0x34,0x12,0xEF,0xCD,0xAB,0x89),79)
local v27=refs.b1(8);refs.b24(v27,0,0x2E);refs.b23(v27,1,refs.b2("abcdef"),2,3);b(refs.b3(v27)==".cde....",80)
local v28=refs.b1(4);refs.b26(v28,3,5,0x15);b(refs.b25(v28,3,5)==0x15,81)
local ok5,err5=pcall(refs.b10,v25,45);local ok6,err6=pcall(refs.b15,v25,-1,0);local ok7,err7=pcall(refs.b13,v25,47,2);b(not ok5 and type(err5)=="string"and not ok6 and type(err6)=="string"and not ok7 and type(err7)=="string",82)
local thread=coroutine.create(function(value)local resumed=coroutine.yield(value+1);return resumed+2 end);b(coroutine.status(thread)=="suspended",31);local resumed,yielded=coroutine.resume(thread,9);b(resumed and yielded==10 and coroutine.status(thread)=="suspended",32);local completed,result=coroutine.resume(thread,11);b(completed and result==13 and coroutine.status(thread)=="dead",33)
local compiledOk,compiled=pcall(loadstring,"return 19, nil, 23","Luraph");b(compiledOk and type(compiled)=="function",34);local compiledFirst,compiledSecond,compiledThird=compiled();b(compiledFirst==19 and compiledSecond==nil and compiledThird==23,35);local ok3,v8,err3=pcall(loadstring,"local =","Luraph2");b(ok3 and v8==nil and type(err3)=="string",36)
local trace=debug.traceback("trace");b(type(trace)=="string"and string.find(trace,"trace",1,true)~=nil,37);local function f3()return true end;b(debug.info(f3,"f")==f3 and type(debug.info(f3,"s"))=="string",38)
local env2=getfenv(0);local f4=function(value)return value end;local f5=rawget(env2,"islclosure");local f6=rawget(env2,"iscclosure");local f7=rawget(env2,"newcclosure");local f8=rawget(env2,"clonefunction");local f9=rawget(env2,"isfunctionhooked");local f10=rawget(env2,"checkcaller");if type(f5)=="function"then b(f5(f4)==true,39)end;if type(f6)=="function"then b(f6(f4)==false,40)end;if type(f7)=="function"then local wrapped=f7(f4);b(type(wrapped)=="function"and wrapped(31)==31,41);if type(f6)=="function"then b(f6(wrapped)==true,42)end end;if type(f8)=="function"then local cloned=f8(pcall);local cloneOk,cloneValue=cloned(function()return 37 end);b(type(cloned)=="function"and cloneOk and cloneValue==37,43)end;if type(f9)=="function"then for _,fn in ipairs({refs.assert,refs.error,refs.pcall,refs.stringByte,refs.tableInsert})do b(f9(fn)==false,44)end end;if type(f10)=="function"then b(type(f10())=="boolean",45)end
b(type(game)=="userdata"and typeof(game)=="Instance"and game.ClassName=="DataModel",46);local service=game:GetService("RunService");b(typeof(service)=="Instance"and service.ClassName=="RunService",47)
b(assert==refs.assert and error==refs.error and getmetatable==refs.getmetatable and next==refs.next and pairs==refs.pairs and pcall==refs.pcall and rawequal==refs.rawequal and rawget==refs.rawget and rawset==refs.rawset and select==refs.select and setmetatable==refs.setmetatable and tonumber==refs.tonumber and tostring==refs.tostring and type==refs.type and xpcall==refs.xpcall and string.byte==refs.stringByte and string.char==refs.stringChar and string.sub==refs.stringSub and table.insert==refs.tableInsert and table.remove==refs.tableRemove and math.floor==refs.mathFloor and coroutine.resume==refs.coroutineResume and debug.info==refs.debugInfo and task.spawn==refs.taskSpawn and loadstring==refs.loadstring and Instance.new==refs.instanceNew and typeof==refs.typeof and buffer==refs.buffer and buffer.create==refs.b1 and buffer.fromstring==refs.b2 and buffer.tostring==refs.b3 and buffer.len==refs.b4 and buffer.readi8==refs.b5 and buffer.readu8==refs.b6 and buffer.readi16==refs.b7 and buffer.readu16==refs.b8 and buffer.readi32==refs.b9 and buffer.readu32==refs.b10 and buffer.readf32==refs.b11 and buffer.readf64==refs.b12 and buffer.readstring==refs.b13 and buffer.writei8==refs.b14 and buffer.writeu8==refs.b15 and buffer.writei16==refs.b16 and buffer.writeu16==refs.b17 and buffer.writei32==refs.b18 and buffer.writeu32==refs.b19 and buffer.writef32==refs.b20 and buffer.writef64==refs.b21 and buffer.writestring==refs.b22 and buffer.copy==refs.b23 and buffer.fill==refs.b24 and buffer.readbits==refs.b25 and buffer.writebits==refs.b26,48)end
local function g()local env=getfenv and getfenv(0)or nil;local gameOk=game~=nil and type(game)~=type({});local newInstance=Instance and Instance.new or nil;local instanceOk=newInstance~=nil and type(newInstance)==type(pcall);local isolatedEnv=getfenv~=nil and env~=nil and type(env)==type({})and(_G==nil or env~=_G);if not gameOk or not instanceOk or not isolatedEnv then a("roblox")end;local getService=game.GetService;if type(getService)~=type(pcall)then a("getservice")end;local ok,players=pcall(getService,game,"Players");if not ok or players==nil or type(players)~=type(game)then a("players")end end
local function h()local issues,uncertain,passes,badStack=0,0,0,false;local debugLib=debug and type(debug)==type({})and debug or nil;local info=debugLib and debugLib.info or nil;local traceback=debugLib and debugLib.traceback or nil;local stringLib=string and type(string)==type({})and string or nil;local match=stringLib and stringLib.match or nil;if info and traceback and match then local function checkNative(value)local ok,source=pcall(function()return info(value,"s")end);if ok and source=="[C]"then passes=passes+1 else issues=issues+1 end end;local function checkPattern(text,pattern,expected)local ok,result=pcall(function()return match(text,pattern)end);if ok and result==expected then passes=passes+1 else issues=issues+1 end end;checkNative(info);checkNative(traceback);local luaFunction=function()return 1 end;local lineOk,line=pcall(function()return info(luaFunction,"l")end);if lineOk and type(line)=="number"then passes=passes+1 else uncertain=uncertain+1 end;checkNative(pcall);checkNative(match);local rawOk,rawError=pcall(rawget);if rawOk then issues=issues+1 elseif type(rawError)=="string"then if match(rawError,"^[^:]+:%d+:")then issues=issues+1 end;if match(rawError,"missing argument")or match(rawError,"bad argument")then passes=passes+1 else issues=issues+1 end else issues=issues+1 end;local marker="rwr8f:153:oesr3c";checkPattern(marker,"^[^:]+:(%d+):","153");checkPattern("98475:-37:oesr3c",".*:%s*(%-%d+):%s","-37");checkPattern("oejn5:oesr3c","^[^:]+:([a-z0-9]+)$","oesr3c");checkPattern("oejn5:oesr3c","^__no_match__$",nil);if passes>=5 then local frameOk,source=pcall(function()return info(4,"s")end);if frameOk and source=="[C]"then issues=issues+1;badStack=true elseif frameOk and source~=nil then uncertain=uncertain+1 end end;local expectedFrames=11;local traceOk,trace=pcall(traceback);if traceOk and type(trace)=="string"then local lines=1;for cursor=1,#trace do if string.byte(trace,cursor)==10 then lines=lines+1 end end;expectedFrames=lines+5 end;local countOk,frameCount=pcall(function()local count=0;for level=1,24 do local ok,source=pcall(function()return info(level,"s")end);if not ok or source==nil then break end;count=count+1 end;return count end);if countOk and type(frameCount)=="number"and frameCount>expectedFrames then issues=issues+1;badStack=true end else issues=issues+1 end;if info and traceback then local hits={0,0,0,0,0};local crossHits=0;local function sample(wrapper)wrapper(function()local ok3,source3=pcall(function()return info(3,"s")end);local ok4,source4=pcall(function()return info(4,"s")end);local ok6,source6=pcall(function()return info(6,"s")end);local ok8,source8=pcall(function()return info(8,"s")end);local ok11,source11=pcall(function()return info(11,"s")end);if ok3 and source3=="[C]"then hits[1]=hits[1]+1 end;if ok4 and source4=="[C]"then hits[2]=hits[2]+1 end;if ok6 and source6=="[C]"then hits[3]=hits[3]+1 end;if ok8 and source8=="[C]"then hits[4]=hits[4]+1 end;if ok11 and source11=="[C]"then hits[5]=hits[5]+1 end;if ok11 and source11~=nil then if ok4 and source4=="[C]"then crossHits=crossHits+1 end;if ok6 and source6=="[C]"then crossHits=crossHits+1 end;if ok8 and source8=="[C]"then crossHits=crossHits+1 end end end)end;local function direct(callback)callback()end;local function nested(callback)local function first()local function second()local function third()callback()end;third()end;second()end;first()end;local function threaded(callback)local create=coroutine and coroutine.create or nil;local resume=coroutine and coroutine.resume or nil;if create and resume then local thread=create(function()callback()end);resume(thread)else callback()end end;sample(direct);sample(nested);sample(threaded);local repeated=0;for index=1,#hits do if hits[index]>=2 then repeated=repeated+1 end end;if repeated>=1 then issues=issues+1;badStack=true elseif crossHits>=2 then uncertain=uncertain+1 end;if repeated*2+crossHits>0 then badStack=true end end;if badStack or(issues>=2 and passes>=4)or(uncertain>=2 and passes>=5)then a("debug")end end
local function i()local call=pcall;local read=rawget;local getGlobalEnv=getgenv;if not call or not read or not getGlobalEnv then return end;local ok,env=call(getGlobalEnv);if not ok or type(env)~="table"then return end;local restore=read(env,"restorefunction");if type(restore)~="function"then return end;local function restoreOne(value)if value then call(restore,value)end end;restoreOne(string and string.byte);restoreOne(setmetatable);restoreOne(pcall);restoreOne(rawget);restoreOne(rawset);restoreOne(pairs);restoreOne(type);restoreOne(getfenv);restoreOne(setfenv)end
local function j()local getmetatable=getfenv()["getmetatable"];local reported=getmetatable(string.char());if reported~="The metatable is locked"then return 196 end;return 171 end
local function k()local ok,result=pcall(setfenv,string.byte,getfenv(string.byte));if ok or result~="'setfenv' cannot change environment of given object"then return 196 end;return 171 end
local function l()local debugLib=getfenv(0)["debug"];local marker=string.char(82,72,75,77,79);local function recurse(depth)if depth==0 then return debugLib["traceback"](marker)end;return recurse(depth-1)end;local trace=recurse(2);local counts={};for digits in string.gmatch(trace,":(%d+)[^\\n]*")do local line=tonumber(digits);if line~=nil then counts[line]=(counts[line]or 0)+1;if counts[line]>2 then return 57 end end end;return 31 end
local function m()local xorProbe=bit32.bxor(26864,13230);local roundtrip=string.byte(string.char(94),1,1);local arity=select("#",23390,94,23390);if xorProbe==23390 and roundtrip==94 and arity==3 then return 63 end;return bit32.bxor(63,103)end
local function n()local jD=j();if jD==171 then jD=k()end;local uE=l();local sG=m();return jD,uE,sG end
local function o(lockResult,traceResult,secondaryResult)return bit32.band(bit32.bor(bit32.bxor(tonumber(lockResult)or 0,171),bit32.bor(bit32.bxor(tonumber(traceResult)or 0,57),bit32.bxor(tonumber(secondaryResult)or 0,63))),255)end
local function p()local jD,uE,sG=n();local ut=o(jD,uE,sG);if ut~=0 then a("probe")end end
g();h();i();p();f()`;

/* -------------------------------------------------------------------------- */
/*  Encryption helpers                                                        */
/* -------------------------------------------------------------------------- */
function generateKey() {
  return crypto.randomBytes(16);
}

function xorEncrypt(source, key) {
  const srcBuf = Buffer.from(source, 'utf8');
  const out = Buffer.alloc(srcBuf.length);
  for (let i = 0; i < srcBuf.length; i++) {
    out[i] = srcBuf[i] ^ key[i % key.length] ^ ((i * 31 + 17) & 0xff);
  }
  return out;
}

function bytesToLuaTable(buf) {
  const parts = [];
  for (let i = 0; i < buf.length; i++) parts.push(buf[i]);
  const lines = [];
  for (let i = 0; i < parts.length; i += 48) {
    lines.push(parts.slice(i, i + 48).join(','));
  }
  return '{' + lines.join(',') + '}';
}

function keyToLuaTable(key) {
  return '{' + Array.from(key).join(',') + '}';
}

function randomBytes(len) {
  return crypto.randomBytes(len);
}

function randomVar() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = chars[Math.floor(Math.random() * 52)];
  for (let i = 0; i < 4 + Math.floor(Math.random() * 5); i++) {
    s += chars[Math.floor(Math.random() * 52)] + (Math.random() < 0.3 ? Math.floor(Math.random() * 10) : '');
  }
  return s;
}

function randomJunkString(len = 24) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function buildProtectedScript(luaSource) {
  const key = generateKey();
  const encrypted = xorEncrypt(luaSource, key);
  const realPayload = bytesToLuaTable(encrypted);
  const keyTable = keyToLuaTable(key);

  const decoyCount = 6 + Math.floor(Math.random() * 4);
  const realIndex = Math.floor(decoyCount / 2);

  const tables = [];
  const varNames = [];

  for (let i = 0; i < decoyCount; i++) {
    const v = randomVar();
    varNames.push(v);
    if (i === realIndex) {
      tables.push(`local ${v}=${realPayload}`);
    } else {
      const fakeLen = 40 + Math.floor(Math.random() * 120);
      const fake = bytesToLuaTable(randomBytes(fakeLen));
      tables.push(`local ${v}=${fake}`);
    }
  }

  const junkVars = [];
  for (let i = 0; i < 5; i++) {
    const v = randomVar();
    junkVars.push(`local ${v}="${randomJunkString(16 + Math.floor(Math.random() * 40))}"`);
  }

  const middleBlock = [
    junkVars[0],
    junkVars[1],
    ...tables.slice(0, realIndex),
    tables[realIndex],
    ...tables.slice(realIndex + 1),
    junkVars[2],
    junkVars[3],
    junkVars[4],
  ].join(';');

  const realVar = varNames[realIndex];
  const keyVar = randomVar();
  const srcVar = randomVar();
  const fnVar = randomVar();

  const loader = `local ${keyVar}=${keyTable};${middleBlock};local ${srcVar}={};for i=1,#${realVar} do local b=${realVar}[i];local kb=${keyVar}[((i-1)%#${keyVar})+1];${srcVar}[i]=string.char(bit32.bxor(b,kb,bit32.band(i*31+17,255)))end;local ${fnVar},err=loadstring(table.concat(${srcVar}));if not ${fnVar} then error(err or"HyperionV1 load failed",0)end;${fnVar}()`;

  return `-- ({{Obfuscated By HyperionV1}})\ndo ${ANTITAMPER_BODY};${loader} end\n`;
}

// --- LUA MINIFIER & OBFUSCATOR ENGINE ---
function minifyLua(code) {
    code = code.replace(/--\[\[[\s\S]*?\]\]/g, '');
    code = code.replace(/--[^\r\n]*/g, '');
    const lines = code.split(/\r?\n/);
    const cleaned = lines.map(l => l.trim()).filter(l => l.length > 0);
    return cleaned.join('\n');
}

function obfuscateLua(code) {
    return buildProtectedScript(code);
}

// Pending obfuscation sessions are kept in memory until the user confirms their settings.
const pendingObfuscations = new Map();
const HYPERION_WATERMARK = '--Obfuscated by HyperionV1 [https://discord.gg/9wJs5bwxRz]';

function makeObfuscationPanel(session) {
    const userId = session.userId;
    const watermarkRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`obf_watermark_${userId}`)
            .setPlaceholder('Row 1 • Choose a watermark')
            .addOptions(
                { label: 'Hyperions Watermark On', value: 'hyperion', description: 'Add the Hyperion watermark to the output.', default: session.settings.watermark === 'hyperion' },
                { label: 'Hyperions Watermark Off', value: 'off', description: 'Output without a watermark.', default: session.settings.watermark === 'off' },
                { label: 'Custom Watermark', value: 'custom', description: 'Type your own watermark.', default: session.settings.watermark === 'custom' }
            )
    );
    const vmRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`obf_vm_${userId}`)
            .setPlaceholder('Row 2 • Choose VM encryption')
            .addOptions(
                { label: 'Intense VM encryption ON', value: 'on', description: 'Encrypts the original source in heavy VM structure.', default: session.settings.intense === true },
                { label: 'Intense VM encryption Off', value: 'off', description: 'The normal and recommended version.', default: session.settings.intense === false }
            )
    );
    const languageRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`obf_language_${userId}`)
            .setPlaceholder('Row 3 • Choose language')
            .addOptions(
                { label: 'LuaU (Roblox)', value: 'luau', description: 'Roblox Luau output.', default: session.settings.language === 'luau' },
                { label: 'Lua', value: 'lua', description: 'Standard Lua output.', default: session.settings.language === 'lua' }
            )
    );
    const finishRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`obf_finish_${userId}`).setLabel('Obfuscate Now').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`obf_cancel_${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
    return [watermarkRow, vmRow, languageRow, finishRow];
}

function makeObfuscationEmbed(session) {
    const watermarkLabel = session.settings.watermark === 'hyperion'
        ? 'Hyperion watermark ON'
        : session.settings.watermark === 'custom'
            ? `Custom watermark: ${session.settings.watermarkText || '(not entered yet)'}`
            : 'Watermark OFF';

    return new EmbedBuilder()
        .setTitle('Obfuscation Panel')
        .setDescription(
            'Hya user, you decided to use the /obfuscate command. Here are some options for ya.\n\n' +
            '**Action Row 1 — Watermark**\n' +
            '• **Hyperions Watermark On** — adds the Hyperion watermark.\n' +
            '• **Hyperions Watermark Off** — outputs without a watermark.\n' +
            '• **Custom Watermark** — enter your own watermark text.\n\n' +
            '**Action Row 2 — Encryption**\n' +
            '• **Intense VM encryption ON** — encrypts the original source in a heavy VM structure.\n' +
            '• **Intense VM encryption Off** — the normal and recommended version.\n\n' +
            '**Action Row 3 — Output language**\n' +
            '• **LuaU (Roblox)** — output for Roblox Luau.\n' +
            '• **Lua** — standard Lua output.'
        )
        .addFields({
            name: 'Current settings',
            value: `• Watermark: ${watermarkLabel}\n` +
                `• Intense VM encryption: ${session.settings.intense ? 'ON' : 'OFF (recommended)'}\n` +
                `• Output language: ${session.settings.language === 'luau' ? 'LuaU (Roblox)' : 'Lua'}`
        })
        .setFooter({ text: 'Use the dropdown menus below the embed to change options.' })
        .setColor(0xFFFFFF);
}

function buildPortableEncryptedScript(code) {
    const key = Math.floor(Math.random() * 200) + 20;
    const bytes = [...Buffer.from(code, 'utf8')].map(byte => (byte + key) % 256).join(',');
    const rand = () => '_' + Math.random().toString(36).slice(2, 10);
    const dataName = rand(), keyName = rand(), sourceName = rand(), loaderName = rand();
    return `local ${dataName}={${bytes}};local ${keyName}=${key};local ${sourceName}={};for i=1,#${dataName} do ${sourceName}[i]=string.char((${dataName}[i]-${keyName})%256) end;local ${loaderName}=loadstring or load;if not ${loaderName} then error("This Lua environment does not support loading source",0) end;local f,e=${loaderName}(table.concat(${sourceName}));if not f then error(e or "Unable to load obfuscated source",0) end;return f()`;
}

function applyWatermark(output, settings) {
    // The protected Luau engine adds its own watermark; remove it so the chosen setting is respected.
    output = output.replace(/^--[^\r\n]*HyperionV1[^\r\n]*\r?\n/, '');
    let watermark = '';
    if (settings.watermark === 'hyperion') watermark = HYPERION_WATERMARK;
    if (settings.watermark === 'custom') {
        const text = (settings.watermarkText || '').trim().replace(/^--\s*/, '');
        if (text) watermark = `--${text}`;
    }
    return watermark ? `${watermark}\n${output}` : output;
}

// --- CLIENT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- REGISTER ALL SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('Sends the Hyperion help panel'),
    new SlashCommandBuilder().setName('daily').setDescription('Claim your daily credits (25 for normal, 100 for premium)'),
    new SlashCommandBuilder().setName('balance').setDescription('Check your current credit balance'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('Shows the top 10 users with the most credits'),
    new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer credits to another user')
        .addIntegerOption(option => option.setName('amount').setDescription('Amount of credits to transfer').setRequired(true))
        .addUserOption(option => option.setName('user').setDescription('User to receive the credits').setRequired(true)),
    new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscates your file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false))
        .addStringOption(option => option.setName('url').setDescription('Raw URL containing downloadable Lua text').setRequired(false)),
    new SlashCommandBuilder()
        .setName('minify')
        .setDescription('Minifies your file or pasted code (Costs 2 credits)')
        .addStringOption(option => option.setName('code').setDescription('Pasted Lua code').setRequired(false))
        .addAttachmentOption(option => option.setName('file').setDescription('Lua file attachment').setRequired(false))
].map(command => command.toJSON());

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Global slash-command registration can take a while and is not needed on every restart.
    // Set REGISTER_COMMANDS=true in Railway only when you add/change slash commands.
    if (process.env.REGISTER_COMMANDS !== 'true') {
        console.log('Skipping slash-command sync (commands are already registered).');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
        .then(() => console.log('Successfully registered all application slash commands!'))
        .catch(error => console.error('Error registering slash commands:', error));
});

// --- INTERACTIONS & COMMANDS ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const data = loadData();
        const userId = interaction.user.id;

        if (data.blacklist && data.blacklist.includes(userId)) {
            await interaction.reply({ content: "❌ You are blacklisted from using this bot.", ephemeral: true });
            return;
        }

        if (interaction.commandName === 'help') {
            const embed = new EmbedBuilder()
                .setTitle("*** Help Menu***")
                .setDescription("***Commands***\n" +
                                "/Obfuscate : Obfuscates a raw URL, file, or pasted code\n" +
                                "/Minify : Minifys your file/pasted code\n" +
                                "/Help : sends this help panel \n" +
                                "/Daily : Gives you 25 credits\n" +
                                "/Balance : checks your credits\n" +
                                "/Transfer <amount> <user> : Transfers credits to another user\n" +
                                "/Leaderboard : Shows a embed of the users that has the most credits")
                .setColor(0xFFFFFF);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`help_commands_${userId}`).setLabel('Commands').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`help_owner_${userId}`).setLabel('Owner').setStyle(ButtonStyle.Secondary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } 
        else if (interaction.commandName === 'daily') {
            const userData = getUser(userId);
            const currentTime = Date.now() / 1000;
            const cooldown = 86400; // 24 hours

            const lastClaimed = userData.users[userId].last_daily;
            if (currentTime - lastClaimed < cooldown) {
                const remaining = Math.floor(cooldown - (currentTime - lastClaimed));
                const hours = Math.floor(remaining / 3600);
                const minutes = Math.floor((remaining % 3600) / 60);
                await interaction.reply({ content: `⏳ You must wait **${hours}h ${minutes}m** before claiming your daily credits again.`, ephemeral: true });
                return;
            }

            const hasPremiumRole = interaction.member && interaction.member.roles.cache.has(PREMIUM_ROLE_ID);
            const reward = hasPremiumRole ? 100 : 25;

            userData.users[userId].credits = Math.min(MAX_CREDITS, userData.users[userId].credits + reward);
            userData.users[userId].last_daily = currentTime;
            saveData(userData);

            await interaction.reply({ content: `✅ You successfully claimed your daily **${reward} credits**!`, ephemeral: true });
        }
        else if (interaction.commandName === 'balance') {
            const userData = getUser(userId);
            const credits = userData.users[userId].credits;
            await interaction.reply({ content: `💰 You currently have **${credits} credits**.`, ephemeral: true });
        }
        else if (interaction.commandName === 'transfer') {
            const amount = interaction.options.getInteger('amount');
            const targetUser = interaction.options.getUser('user');

            if (amount <= 0) {
                await interaction.reply({ content: "❌ You must transfer a positive amount of credits.", ephemeral: true });
                return;
            }

            if (targetUser.id === userId) {
                await interaction.reply({ content: "❌ You cannot transfer credits to yourself.", ephemeral: true });
                return;
            }

            if (targetUser.bot) {
                await interaction.reply({ content: "❌ You cannot transfer credits to a bot.", ephemeral: true });
                return;
            }

            const userData = getUser(userId);
            const senderCredits = userData.users[userId].credits;

            if (senderCredits < amount) {
                await interaction.reply({ content: `❌ You do not have enough credits! Your current balance is **${senderCredits} credits**.`, ephemeral: true });
                return;
            }

            getUser(targetUser.id);
            userData.users[userId].credits -= amount;
            userData.users[targetUser.id].credits = Math.min(MAX_CREDITS, userData.users[targetUser.id].credits + amount);
            saveData(userData);

            await interaction.reply({ content: `💸 Successfully transferred **${amount} credits** to ${targetUser.toString()}!` });
        }
        else if (interaction.commandName === 'leaderboard') {
            const users = data.users || {};
            
            const sortedUsers = Object.entries(users)
                .sort(([, a], [, b]) => (b.credits || 0) - (a.credits || 0))
                .slice(0, 10);

            let description = "";
            if (sortedUsers.length === 0) {
                description = "No users found on the leaderboard yet.";
            } else {
                let rank = 1;
                for (const [uid, uData] of sortedUsers) {
                    description += `${rank}. <@${uid}> Credits = ${uData.credits}\n`;
                    rank++;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle("**LeaderBoard**")
                .setDescription(description)
                .setColor(0xFFFFFF);

            await interaction.reply({ embeds: [embed] });
        }
        else if (interaction.commandName === 'obfuscate' || interaction.commandName === 'minify') {
            const userData = getUser(userId);
            if (userData.users[userId].credits < 2) {
                await interaction.reply({ content: "❌ **Access Denied:** You need at least **2 credits** to use this command. Use `/daily` to get credits!", ephemeral: true });
                return;
            }

            const codeOpt = interaction.options.getString('code');
            const fileOpt = interaction.options.getAttachment('file');
            const urlOpt = interaction.options.getString('url');
            let luaCode = "";

            if (urlOpt) {
                let parsedUrl;
                try {
                    parsedUrl = new URL(urlOpt);
                } catch (_) {
                    parsedUrl = null;
                }

                // Accept only known raw-text endpoints; reject ordinary pages and other hosts.
                const host = parsedUrl?.hostname.toLowerCase();
                const path = parsedUrl?.pathname || '';
                const isRawLink = parsedUrl && parsedUrl.protocol === 'https:' &&
                    !parsedUrl.username && !parsedUrl.password &&
                    ((host === 'pastebin.com' && /^\/raw\/[A-Za-z0-9]+\/?$/.test(path)) ||
                     // Pastefy supports both /raw/<id> and /<id>/raw URL formats.
                     (host === 'pastefy.app' && (/^\/raw\/[A-Za-z0-9_-]+\/?$/.test(path) || /^\/[A-Za-z0-9_-]+\/raw\/?$/.test(path))) ||
                     (host === 'api.rubis.com' && /^\/raw\/[A-Za-z0-9._/-]+$/.test(path)) ||
                     // Rubis API scrap links use /v2/scrap/<id>/raw on api.rubis.app.
                     (host === 'api.rubis.app' && /^\/v2\/scrap\/[A-Za-z0-9_-]+\/raw\/?$/.test(path)) ||
                     (host === 'raw.githubuser.com' && /^\/[A-Za-z0-9._/-]+$/.test(path)) ||
                     (host === 'raw.githubusercontent.com' && /^\/[A-Za-z0-9._/-]+$/.test(path)));

                if (!isRawLink) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('Link/Url isnt a raw link containing downloadable text')
                        .setColor(0xFFFFFF);
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
                }

                try {
                    const response = await fetch(parsedUrl.href, {
                        signal: AbortSignal.timeout(12000),
                        headers: { 'User-Agent': 'HyperionBot/1.0' }
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const declaredLength = Number(response.headers.get('content-length') || 0);
                    if (declaredLength > 1_000_000) throw new Error('Remote text is too large');
                    luaCode = await response.text();
                    if (Buffer.byteLength(luaCode, 'utf8') > 1_000_000) throw new Error('Remote text is too large');
                    if (!luaCode.trim()) throw new Error('Remote text is empty');
                } catch (e) {
                    const errorEmbed = new EmbedBuilder()
                        .setTitle('Error')
                        .setDescription('Could not download text from that raw URL. Check that the link exists and is publicly accessible.')
                        .setColor(0xFFFFFF);
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    return;
                }
            } else if (fileOpt) {
                if (!fileOpt.name.endsWith('.lua')) {
                    await interaction.reply({ content: "❌ Please upload a valid `.lua` file.", ephemeral: true });
                    return;
                }
                try {
                    const response = await fetch(fileOpt.url);
                    luaCode = await response.text();
                } catch (e) {
                    await interaction.reply({ content: "❌ Failed to read the attached file.", ephemeral: true });
                    return;
                }
            } else if (codeOpt) {
                luaCode = codeOpt;
            } else {
                await interaction.reply({ content: "❌ Please provide a raw URL, pasted code, or attach a Lua file.", ephemeral: true });
                return;
            }

            const isObf = interaction.commandName === 'obfuscate';
            if (isObf) {
                const session = {
                    userId,
                    code: luaCode,
                    settings: { watermark: 'hyperion', watermarkText: '', intense: false, language: 'luau' }
                };
                pendingObfuscations.set(userId, session);
                // Public panel: editing an ephemeral interaction can only produce an ephemeral result.
                // Keep the panel and final output in one public message visible to the channel.
                await interaction.reply({
                    embeds: [makeObfuscationEmbed(session)],
                    components: makeObfuscationPanel(session),
                    ephemeral: false
                });
                return;
            }

            userData.users[userId].credits -= 2;
            saveData(userData);
            const output = minifyLua(luaCode);
            const attachment = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: 'minified.lua' });
            await interaction.reply({
                content: '•──────⋅☾⚒️☽⋅──────•\n**✅ • Minification Success**\n**🖤 • Thx for using Hyperion**\n•──────⋅☾⚒️☽⋅──────•',
                files: [attachment]
            });
        }
    } 
    else if (interaction.isStringSelectMenu()) {
        if (!interaction.customId.startsWith('obf_')) return;
        const session = pendingObfuscations.get(interaction.user.id);
        if (!session || !interaction.customId.endsWith(`_${interaction.user.id}`)) {
            await interaction.reply({ content: 'This obfuscation panel is not yours or has expired. Run `/obfuscate` again.', ephemeral: true });
            return;
        }
        const selected = interaction.values[0];
        if (interaction.customId.startsWith('obf_watermark_')) {
            if (selected === 'custom') {
                const modal = new ModalBuilder()
                    .setCustomId(`obf_modal_${interaction.user.id}`)
                    .setTitle('Custom Watermark');
                const watermarkInput = new TextInputBuilder()
                    .setCustomId('watermark_text')
                    .setLabel('Type your watermark')
                    .setPlaceholder('Example = Obfuscated by User')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(150)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(watermarkInput));
                await interaction.showModal(modal);
                return;
            }
            session.settings.watermark = selected;
            session.settings.watermarkText = '';
        } else if (interaction.customId.startsWith('obf_vm_')) {
            session.settings.intense = selected === 'on';
        } else if (interaction.customId.startsWith('obf_language_')) {
            session.settings.language = selected;
        }
        await interaction.update({ embeds: [makeObfuscationEmbed(session)], components: makeObfuscationPanel(session) });
    }
    else if (interaction.isModalSubmit()) {
        if (!interaction.customId.startsWith('obf_modal_')) return;
        const session = pendingObfuscations.get(interaction.user.id);
        if (!session || interaction.customId !== `obf_modal_${interaction.user.id}`) {
            await interaction.reply({ content: 'This obfuscation panel has expired. Run `/obfuscate` again.', ephemeral: true });
            return;
        }
        const watermarkText = interaction.fields.getTextInputValue('watermark_text').trim();
        if (!watermarkText) {
            await interaction.reply({ content: 'Please enter a non-empty watermark.', ephemeral: true });
            return;
        }
        session.settings.watermark = 'custom';
        session.settings.watermarkText = watermarkText.replace(/^--\s*/, '');
        await interaction.update({ embeds: [makeObfuscationEmbed(session)], components: makeObfuscationPanel(session) });
    }
    else if (interaction.isButton()) {
        if (interaction.customId.startsWith('obf_cancel_')) {
            const ownerId = interaction.customId.slice('obf_cancel_'.length);
            if (interaction.user.id !== ownerId) {
                await interaction.reply({ content: 'This panel is not yours.', ephemeral: true });
                return;
            }
            pendingObfuscations.delete(ownerId);
            await interaction.update({ content: 'Obfuscation cancelled. No credits were charged.', embeds: [], components: [] });
            return;
        }
        if (interaction.customId.startsWith('obf_finish_')) {
            const ownerId = interaction.customId.slice('obf_finish_'.length);
            if (interaction.user.id !== ownerId) {
                await interaction.reply({ content: 'This panel is not yours.', ephemeral: true });
                return;
            }
            const session = pendingObfuscations.get(ownerId);
            if (!session) {
                await interaction.reply({ content: 'This panel has expired. Run `/obfuscate` again.', ephemeral: true });
                return;
            }
            if (session.settings.intense && session.settings.language === 'lua') {
                await interaction.reply({ content: 'Intense VM encryption currently requires **LuaU (Roblox)**. Select LuaU or turn Intense VM encryption off.', ephemeral: true });
                return;
            }
            const userData = getUser(ownerId);
            if (userData.users[ownerId].credits < 2) {
                pendingObfuscations.delete(ownerId);
                await interaction.update({ content: '❌ You no longer have enough credits. You need 2 credits to obfuscate.', embeds: [], components: [] });
                return;
            }
            userData.users[ownerId].credits -= 2;
            saveData(userData);
            let output;
            if (session.settings.intense) {
                output = buildProtectedScript(minifyLua(session.code)).replace(/^--[^\r\n]*HyperionV1[^\r\n]*\r?\n/, '');
            } else {
                output = buildPortableEncryptedScript(minifyLua(session.code));
            }
            output = applyWatermark(output, session.settings);
            // Remove empty lines and trim generated lines to keep the output compact without
            // joining Lua comments and code onto the same line.
            output = output.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join('\n');
            const attachment = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: session.settings.language === 'luau' ? 'obfuscated.luau' : 'obfuscated.lua' });
            pendingObfuscations.delete(ownerId);
            const successEmbed = new EmbedBuilder()
                .setDescription('•──────────────────⋅☾⚒️☽⋅──────────────────•\n\n✅ • **Obfuscation Success**\n🖤 • Thx for using Hyperion\n ⚒️ • Support us by Vouching in the Vouching channel\n•──────────────────⋅☾⚒️☽⋅──────────────────•')
                .setColor(0xFFFFFF);
            // Edit the existing public panel once. Do not reply/followUp/send separately,
            // so the attachment and single success embed stay in one public message.
            await interaction.update({
                content: null,
                embeds: [successEmbed],
                components: [],
                files: [attachment],
                allowedMentions: { parse: [] }
            });
            return;
        }
        if (!interaction.customId.startsWith('help_')) return;
        const parts = interaction.customId.split('_');
        const type = parts[1];   
        const ownerId = parts[2]; 

        if (interaction.user.id !== ownerId) {
            await interaction.reply({ content: "You cannot use other users help menu.", ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder();
        if (type === 'commands') {
            embed.setTitle("*** Help Menu***")
                 .setDescription("***Commands***\n" +
                                 "/Obfuscate : Obfuscates a raw URL, file, or pasted code\n" +
                                 "/Minify : Minifys your file/pasted code\n" +
                                 "/Help : sends this help panel \n" +
                                 "/Daily : Gives you 25 credits\n" +
                                 "/Balance : checks your credits\n" +
                                 "/Transfer <amount> <user> : Transfers credits to another user\n" +
                                 "/Leaderboard : Shows a embed of the users that has the most credits")
                 .setColor(0xFFFFFF);
            await interaction.update({ embeds: [embed] });
        } else if (type === 'owner') {
            embed.setTitle("**👑Owner Only**")
                 .setDescription("**Commands**\n" +
                                 ".credit <number> <user> : Gives a user credit\n" +
                                 ".delcre <number> <user> : Deletes an amount of credit from a selected user (can go in debt)\n" +
                                 ".blacklist <user> : Blacklits a user so they cant use the bot\n" +
                                 ".unblacklist <user> : Unblacklists a user\n" +
                                 ".ping : Checks the ping of the bot\n" +
                                 ".premium <user> : Gives user premium improved daily now getting 100 credits from the /daily")
                 .setColor(0xFFFFFF);
            await interaction.update({ embeds: [embed] });
        }
    }
});

// --- PREFIX COMMANDS (OWNER / ROLE ONLY) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const ownerCommands = ['credit', 'delcre', 'blacklist', 'unblacklist', 'ping', 'premium'];
    if (ownerCommands.includes(command)) {
        if (!hasOwnerOrRole(message.member)) {
            await message.reply("❌ **Access Denied:** You do not have the required Role to run owner commands.");
            return;
        }

        const data = loadData();

        if (command === 'ping') {
            const latency = Math.round(client.ws.ping);
            await message.channel.send(`🏓 Pong! Latency: **${latency}ms**`);
        }
        else if (command === 'credit') {
            const amount = parseInt(args[0]);
            const member = message.mentions.members.first();
            if (isNaN(amount) || !member) {
                await message.channel.send("❌ Usage: `.credit <number> @user`");
                return;
            }
            const userData = getUser(member.id);
            userData.users[member.id].credits = Math.min(MAX_CREDITS, userData.users[member.id].credits + amount);
            saveData(userData);
            await message.channel.send(`✅ Added **${amount} credits** to ${member.toString()}.`);
        }
        else if (command === 'delcre') {
            const amount = parseInt(args[0]);
            const member = message.mentions.members.first();
            if (isNaN(amount) || amount <= 0 || !member) {
                await message.channel.send("❌ Usage: `.delcre <number> @user`");
                return;
            }
            const userData = getUser(member.id);
            
            userData.users[member.id].credits -= amount;
            const newCredits = userData.users[member.id].credits;
            saveData(userData);

            await message.channel.send(`✅ Removed **${amount} credits** from ${member.toString()}. New Balance: **${newCredits} credits**.`);
        }
        else if (command === 'blacklist') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.blacklist @user`");
                return;
            }
            if (!data.blacklist) data.blacklist = [];
            const uid = member.id;
            if (!data.blacklist.includes(uid)) {
                data.blacklist.push(uid);
                saveData(data);
                await message.channel.send(`✅ Blacklisted ${member.toString()}.`);
            } else {
                await message.channel.send(`❌ ${member.toString()} is already blacklisted.`);
            }
        }
        else if (command === 'unblacklist') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.unblacklist @user`");
                return;
            }
            if (!data.blacklist) data.blacklist = [];
            const uid = member.id;
            const index = data.blacklist.indexOf(uid);
            if (index > -1) {
                data.blacklist.splice(index, 1);
                saveData(data);
                await message.channel.send(`✅ Unblacklisted ${member.toString()}.`);
            } else {
                await message.channel.send(`❌ ${member.toString()} is not on the blacklist.`);
            }
        }
        else if (command === 'premium') {
            const member = message.mentions.members.first();
            if (!member) {
                await message.channel.send("❌ Usage: `.premium @user`");
                return;
            }
            
            try {
                if (member.roles.cache.has(PREMIUM_ROLE_ID)) {
                    await member.roles.remove(PREMIUM_ROLE_ID);
                    await message.channel.send(`❌ Removed Premium role <@&${PREMIUM_ROLE_ID}> from ${member.toString()}.`);
                } else {
                    await member.roles.add(PREMIUM_ROLE_ID);
                    await message.channel.send(`👑 Granted Premium role <@&${PREMIUM_ROLE_ID}> to ${member.toString()}! (Daily reward upgraded to 100 credits).`);
                }
            } catch (err) {
                console.error("Error giving role:", err);
                await message.channel.send("❌ Failed to modify user roles. Make sure the bot's role is positioned ABOVE the Premium role in Server Settings -> Roles!");
            }
        }
    }
});

client.login(TOKEN);