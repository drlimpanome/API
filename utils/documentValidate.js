import fetch from "node-fetch";

export function validateDocument(document) {
    // Remove non-numeric characters
    if (!document) return { type: 'Unknown', isValid: false };
    document = document.toString().replace(/[^\d]/g, '');

    console.log(document)
    if (document.length === 11) {
        // If the length is 11 digits, it's a CPF
        const isValid = validateCPF(document);
        return {
            type: 'CPF',
            isValid: isValid,
            document: isValid ? formatCPF(document) : document
        };
    } else if (document.length === 14) {
        // If the length is 14 digits, it's a CNPJ
        const isValid = validateCNPJ(document);
        return {
            type: 'CNPJ',
            isValid: isValid,
            document: isValid ? formatCNPJ(document) : document
        };
    } else {
        // Otherwise, the document type is unknown
        return { type: 'Unknown', isValid: false };
    }
}

export async function getConfereTK() {
    const urlToken = 'http://localhost:81/get_token_confere'
    const response = await fetch(urlToken);
    const tokenObj = JSON.parse(await response.text())
    return tokenObj.token
}

export function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(.)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let checkDigit1 = 11 - (sum % 11);
    checkDigit1 = checkDigit1 > 9 ? 0 : checkDigit1;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    let checkDigit2 = 11 - (sum % 11);
    checkDigit2 = checkDigit2 > 9 ? 0 : checkDigit2;

    return parseInt(cpf.charAt(9)) === checkDigit1 && parseInt(cpf.charAt(10)) === checkDigit2;
}

export function validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]/g, '');

    if (cnpj.length !== 14 || /^(.)\1+$/.test(cnpj)) return false;

    let sum = 0;
    let multiplier = 2;
    for (let i = 11; i >= 0; i--) {
        sum += parseInt(cnpj.charAt(i)) * multiplier;
        multiplier = multiplier === 9 ? 2 : multiplier + 1;
    }

    let checkDigit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cnpj.charAt(12)) !== checkDigit1) return false;

    sum = 0;
    multiplier = 2;
    for (let i = 12; i >= 0; i--) {
        sum += parseInt(cnpj.charAt(i)) * multiplier;
        multiplier = multiplier === 9 ? 2 : multiplier + 1;
    }

    let checkDigit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(cnpj.charAt(13)) === checkDigit2;
}

export function formatCPF(cpf) {
    // Format CPF as ***.***.***-**
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj) {
    // Format CNPJ as **.***.***/****-**
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function filterRelevantData(data) {
    const relevantTables = ['scpc', 'protesto', 'refin_pefin', 'devedores'];
    const filteredData = {};

    relevantTables.forEach(table => {
        if (data[table]) {
            filteredData[table] = data[table];
        }
    });

    return filteredData;
}

export function calculateTotalDebt(data) {
    const debts = new Set();
    const ignoreList = new Set();

    if (!data || typeof data !== 'object') {
        console.warn("Formato de dados inválido para cálculo de dívida.");
        return "0.00";
    }

    Object.keys(data).forEach(table => {
        const entries = data[table];
        if (!Array.isArray(entries)) {
            console.warn(`Tabela ${table} está vazia ou mal formatada.`);
            return;
        }

        entries.forEach(entry => {
            let { data: date, valor: value } = entry;
            
            // Verificar se o valor é uma string antes de usar replace()
            if (typeof value === 'string') {
                value = value.replace('R$', '').replace('.', '').replace(',', '.').trim();
            }
            
            const valueNumeric = parseFloat(value);

            if (date && !isNaN(valueNumeric)) {
                debts.add({ date, value: valueNumeric, table });
            }
        });
    });

    let totalDebt = 0;
    debts.forEach(debt => {
        if (ignoreList.has(debt)) return;
        totalDebt += debt.value;
    });

    return totalDebt.toFixed(2);
}

