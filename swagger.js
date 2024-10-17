// swagger.js
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Documentação da API do Dr. Limpa Nome",
    },
    servers: [
      {
        url: "http://localhost:80",
      },
    ],
  },
  apis: ["./index.js"], // Caminho para o seu arquivo principal onde as rotas estão definidas
};

const swaggerSpec = swaggerJSDoc(options);

const swaggerDocs = (app, port) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(`Swagger disponível em http://localhost:${port}/api-docs`);
};

export default swaggerDocs;
