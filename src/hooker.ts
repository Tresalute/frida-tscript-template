
enum HookState{
    HK_ENABLE,
    HK_DISABLE,
}

export class Hook {
    private _hookTargetName: string | null = null;
    private _hookTargetAddr: number | null = null;
    private _hookTargetModuleName: string | null = null;
    private _hookStatus: HookState = HookState.HK_DISABLE;

    private _hookTargetFuncRetType: NativeType | null = null;
    private _hookTargetFuncParamterTyep: NativeType[] | null = null;

    private _listener: InvocationListener | null = null;

    constructor(
        moduleName: string | null = null,
        name: string | null = null,
        addr: number | null = null
    ) {
        this._hookTargetModuleName = moduleName;
        this._hookTargetName = name;
        this._hookTargetAddr = addr;
    }

    set hookName(name: string) { this._hookTargetName = name; }
    set hookAddr(addr: number) { this._hookTargetAddr = addr; }
    set hookModuleName(moduleName: string) { this._hookTargetModuleName = moduleName; }
    set targetFuncRetType(retType:NativeType) { this._hookTargetFuncRetType = retType;}
    set targetFuncParameterType(parameterType:NativeType[]) { this._hookTargetFuncParamterTyep = parameterType;}

    public hook(callBacks: InvocationListenerCallbacks) {
        if(this._hookStatus === HookState.HK_ENABLE){return null;}
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return null;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return null;
                }
            }else {
                this._listener = Interceptor.attach(nativeFuncAddr, callBacks);
                console.log('[Hook] ' + this._hookTargetName + ' is hooked!');
                this._hookStatus = HookState.HK_ENABLE;
                return this._listener;
            }
        }else if(this._hookTargetAddr !== null){
            let pointerAddr = new NativePointer(this._hookTargetAddr);
            this._listener = Interceptor.attach(pointerAddr, callBacks);
            console.log('[InlineHook]' + this._hookTargetAddr + ' is hooked!');
            this._hookStatus = HookState.HK_ENABLE;
            return this._listener; 
        }else{
            console.warn("hookTargetName | hookTargetAddr must be set!");
            return null;
        }
    }

    public invoke(...args: NativeArgumentValue[]){
        if(this._hookTargetName !== null){
            let nativeFuncAddr = Module.getExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return null;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return null;
                }
            }else{
                if(this._hookTargetFuncRetType === null){
                    console.error('funcation ret type must be set!');
                    return null;
                }
                if(this._hookTargetFuncRetType !== null &&
                    this._hookTargetFuncParamterTyep !== null
                    ){
                        let nativeFunc = new NativeFunction(nativeFuncAddr, this._hookTargetFuncRetType, this._hookTargetFuncParamterTyep);
                        if(nativeFunc.isNull()){console.log('NativeFunc is null!');}
                        console.log("calling "+ this._hookTargetName);
                        return nativeFunc(...args);
                    }
            }            
        }
    }

    public replace(callBacks: NativeCallback){
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if(this._hookTargetModuleName !== null){
                    console.warn("Not found target func => " + this._hookTargetName + " in "+this._hookTargetModuleName);
                    return null;
                }else{
                    console.warn("Not found target func => " + this._hookTargetName);
                    return null;
                }
            }else {
                Interceptor.replace(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ENABLE;
                console.log(this._hookTargetName + ' is replaced!');
                return null;
            }
        }else{
            console.warn("hookTargetName must be set!");
            return null;
        }
    }

    public unHook() {
        if(this._hookStatus === HookState.HK_DISABLE){ return null; }
        this._listener?.detach();

        this._hookStatus = HookState.HK_DISABLE;
    }

}


export function APIMonitor(name: string, libname?: string | null, callBacks?: InvocationListenerCallbacks | null) {
    let hooker = new Hook(libname, name);
    if (callBacks !== undefined && callBacks !== null) {
        hooker.hook(callBacks);
        return null;
    }
    return hooker.hook({
        onEnter: function () {
            console.log('[+] ' + name + ' start');
        },
        onLeave: function () {
            console.log('[+] ' + name + ' end');
        }
    });
}