import { Op } from 'sequelize';
import FaixaFinanceira from '../models/faixaFinanceira.js';
import Ticket from '../models/TbTIcket.js';

const regions = {
    'SDT 1': ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24'],
    'SDT 2': ['27', '28', '31', '32', '33', '34', '35', '37', '38'],
    'SCO 1': ['41', '42', '43', '44', '45', '46', '47', '48', '49', '61', '65', '66'],
    'SCO 2': ['51', '53', '54', '55', '62', '64', '67'],
    'NOR 1': ['63', '68', '69', '71', '73', '74', '75', '77', '81', '84', '87', '92', '95', '97'],
    'NOR 2': ['79', '82', '83', '85', '86', '88', '89', '91', '93', '94', '96', '98', '99']
  };
  
  

async function VerifyFaixa(valor, id) {
    try {
        // Ensure the input is a number and is finite
        if (typeof valor !== 'number' || !isFinite(valor)) {
            throw new Error('Invalid input: the value must be a finite number.');
        }

        // Find the faixa that the passed value falls into
        const faixa = await FaixaFinanceira.findOne({
            where: {
                min_value: { [Op.lte]: valor }, // min_value <= valor
                [Op.or]: [
                    { max_value: { [Op.gte]: valor } }, // max_value >= valor
                    { max_value: { [Op.is]: null } }    // or max_value is null (no upper limit)
                ]
            }
        });

        const region = await verifyRegion(id)
        if (!faixa) {
            return {
                region,
                name: 'Nada Consta',
                valor
            };
        }
        return { name: faixa.name , region, valor };
    } catch (error) {
        return {
            region,
            valor,
            name: 'Nada Consta'
        };
    }
}

export async function verifyRegion(id) {
    const returnFindOne = await Ticket.findOne({
        where: { id_ticket: id },
        attributes: ['whatsapp_id']
    });
    if (!returnFindOne) return 'Ticket para esse id_ticket não Existe mais.';
    return findRegionByDDD(extractDDD(returnFindOne.whatsapp_id));
}

function extractDDD(phoneNumber) {
    // First, remove any non-numeric characters
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Check if the phone number starts with the Brazilian country code "55"
    if (phoneNumber.startsWith('55') && phoneNumber.length > 10) {
        // The DDD is the next two digits after "55"
        return phoneNumber.substring(2, 4);
    } else if (phoneNumber.length === 10) {
        // If it doesn't start with "55" and has 10 digits, assume the first two are the DDD
        return phoneNumber.substring(0, 2);
    } else {
        // Return 'Invalid' if the phone number format isn't recognized
        return 'Invalid';
    }
}

function findRegionByDDD(ddd) {
    if (ddd === 'Invalid') return 'Invalid'
    console.log(ddd)
    for (const key in regions) {
        if (regions[key].includes(ddd)) {
            return key;
        }
    }
    return 'pn1'; // or return null if you prefer no result
}

export default VerifyFaixa;
