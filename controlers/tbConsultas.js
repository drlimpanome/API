import { where } from "sequelize";
import TbConsultas from "../models/tbconsultas.js";
import Ticket from "../models/TbTIcket.js";

export async function createConsulta(document, id, res) {
  try {
    const ticket = await Ticket.findOne({ where: { id_ticket: id } });

    if (!ticket) {
      throw new Error("No such ticket exists");
    }

    await ticket.update({ cpf: document });
    await TbConsultas.update(
      { documento: document, status_id: 1 },
      { where: { id_ticket: id } }
    );

    return true;
  } catch (error) {
    console.error("Error in createConsulta:", error);
    throw error;
  }
}

export async function addUrlAws(url, id) {
  try {
    const thereisone = await TbConsultas.findOne({ where: { contact_id: id } });
    console.log("Found:", thereisone);

    if (!thereisone) {
      throw new Error("No such ticket exists");
    }
    const newConsulta = await TbConsultas.update(
      { url: url },
      { where: { contact_id: id } }
    );
    console.log(newConsulta);
    if (newConsulta[0] === 0) {
      throw new Error("No ticket updated"); // Better error handling
    }
    return newConsulta;
  } catch (error) {
    console.error("Error in createConsulta:", error);
    throw error;
  }
}

export async function addUnidade(unidade, id) {
  try {
    const thereisone = await TbConsultas.findOne({ where: { id_ticket: id } });
    if (!thereisone) {
      console.log("erro", "No such ticket exists");
      return;
    }
    const newConsulta = await TbConsultas.update(
      { unidade: unidade },
      { where: { id_ticket: id } }
    );
    if (newConsulta[0] === 0) {
      console.log("erro", "No ticket was updated");
      return;
    }
    return newConsulta;
  } catch (error) {
    throw error;
  }
}

export async function getUrlViaId(id) {
  try {
    const thereisone = await TbConsultas.findOne({ where: { id_ticket: id } });

    if (!thereisone) {
      throw new Error("No such ticket exists");
    }

    const newConsulta = await TbConsultas.findOne({
      where: { id_ticket: id },
      attributes: ["status_id", "url", "divida"],
    });

    if (newConsulta[0] === 0) {
      throw new Error("No ticket updated"); // Better error handling
    }
    console.log(newConsulta.url);
    return {
      status_id: newConsulta.status_id,
      url: newConsulta.url,
      divida: newConsulta.divida,
    };
  } catch (error) {
    console.error("Error in createConsulta:", error);
    throw error;
  }
}

export async function addPaymentIdToTicket(paymentId, id) {
  try {
    const thereisone = await TbConsultas.findOne({ where: { id_ticket: id } });
    if (!thereisone) {
      throw new Error("No such ticket exists");
    }
    const newConsulta = await TbConsultas.update(
      { payment_id: paymentId },
      { where: { id_ticket: id } }
    );
    if (newConsulta[0] === 0) {
      throw new Error("No ticket was updated"); // Better error handling
    }
    return newConsulta;
  } catch (error) {
    throw error;
  }
}

export async function verifyPayedConsulta(id) {
  try {
    const thereisone = await TbConsultas.findOne({
      where: { id_ticket: id, payed: true },
    });
    if (!thereisone) {
      return false;
    }
    return true;
  } catch (error) {
    throw error;
  }
}
