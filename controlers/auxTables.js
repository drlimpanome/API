import ChequeSemFundo from '../models/ChequeSemFundo.js';
import Cadin from '../models/Cadin.js';
import ConRes from '../models/ConRes.js';
import Devedores from '../models/Devedores.js';
import Protesto from '../models/Protesto.js';
import RefinPefin from '../models/RefinPefin.js';
import SCPC from '../models/SCPC.js';
import SICCF from '../models/SICCF.js';
import SICOW from '../models/SICOW.js';
import SICAD from '../models/SICAD.js';
import Sinad from '../models/Sinad.js';

export async function insertIntoAuxTables(ticketId, data) {
    try {
        // Inserir dados em cada tabela auxiliar com base nos dados fornecidos
        await Promise.all([
            ChequeSemFundo.create({ ticketId, ...data.chequeSemFundo }),
            Cadin.create({ ticketId, ...data.cadin }),
            ConRes.create({ ticketId, ...data.conres }),
            Devedores.create({ ticketId, ...data.devedores }),
            Protesto.create({ ticketId, ...data.protesto }),
            RefinPefin.create({ ticketId, ...data.refinPefin }),
            SCPC.create({ ticketId, ...data.scpc }),
            SICCF.create({ ticketId, ...data.siccf }),
            SICOW.create({ ticketId, ...data.sicow }),
            SICAD.create({ ticketId, ...data.sicad }),
            Sinad.create({ ticketId, ...data.sinad })
        ]);
        console.log('Dados inseridos nas tabelas auxiliares com sucesso');
    } catch (error) {
        console.error('Erro ao inserir dados nas tabelas auxiliares:', error);
        throw error;
    }
}
