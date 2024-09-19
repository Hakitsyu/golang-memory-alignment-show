type VarType = {
    name: string
    size: number,
}
type PointerVarType = VarType & { 
    pointer: VarType 
} 

const { int64, int32, byte }: { 
    [name: string]: VarType | PointerVarType 
} = { 
    int64: { 
        name: 'int64', 
        size: 8 
    }, 
    int32: { 
        name: 'int32', 
        size: 4 
    }, 
    byte: { 
        name: 'byte', 
        size: 1, 
        pointer: { 
            name: 'byte', 
            // 4 bytes (32-bit arch) or 8 bytes (64-bit arch)             size: 8
            size: 8 
        } 
    } 
} 

type ArrayType = VarType & { 
    type: VarType 
} 

const array = (type: VarType, length: number): ArrayType => ({ name: 'array', size: type.size * length, type: type }) 

const isArray = (type: VarType) => type.name == 'array'; 

type StructType = { 
    [key: string]: VarType 
} 

const generateMemoryAlignment = (structType: StructType): { 
    view: string[][],
    size: number 
} => { 
    const fields: VarType[] = Object.keys(structType)
        .map(fieldName => ({ name: fieldName, type: structType[fieldName] }))
        .flatMap(field => { 
            if (isArray(field.type)) { 
                const arrayType = field.type as ArrayType; 
                const length = arrayType.size / arrayType.type.size; 
                return [...new Array(length)].map(() => arrayType.type); 
            } 
            
            return [field.type]; 
        }); 
        
    const biggerFieldTypeSize = Math.max(...fields.map(s => s.size)); 
    const view = new Array<Array<string>>(); 
    let a = new Array<string>(biggerFieldTypeSize); 
    let p = 0; 
    
    fields.forEach((field, fieldIndex) => { 
        const freeSpace = a.length - p; 
        if (field.size > freeSpace) { 
            view.push(a); 
            a = new Array<string>(biggerFieldTypeSize); 
            p = 0; 
        } 
        
        let vi: number | undefined = undefined; 
        for (let i = p; i < a.length; i++) { 
            if (vi === undefined) { 
                if (Number.isInteger(i / field.size)) { 
                    vi = i; 
                    a[i] = field.name; 
                    p = i + 1; 
                } 
            } else if (i < vi + (field.size)) { 
                a[i] = field.name; p = i + 1; 
            } 
        } 
        
        if (fieldIndex == fields.length - 1) { 
            view.push(a); 
        } 
    }); 
    
    return { view, size: view[0].length * view.length } 
} 
    
/*
    These example's can be found on https://blog.devtrovert.com/p/struct-optimization-a-small-change 
*/    
const exampleStructTypeA: StructType = {
    a: byte,
    b: int32,
    c: byte,
    d: int64,
    e: byte
}

const { view: viewA, size: sizeA } = generateMemoryAlignment(exampleStructTypeA);
console.log(sizeA);
console.table(viewA);

const exampleStructTypeB: StructType = { 
    b: int32, 
    a: byte, 
    c: byte, 
    e: byte, 
    d: int64 
}

const { view: viewB, size: sizeB } = generateMemoryAlignment(exampleStructTypeB);
console.log(sizeB);
console.table(viewB);

const exampleStructTypeC: StructType = { 
    a: array(int32, 5), 
    b: byte, 
    BPtr: byte.pointer 
}

const { view: viewC, size: sizec } = generateMemoryAlignment(exampleStructTypeC);
console.log(sizec);
console.table(viewC);