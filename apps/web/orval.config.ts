import { defineConfig } from "orval";

export default defineConfig({
  tycheApi: {
    input: { target: "../api/api/openapi.yaml" },
    output: {
      target: "./src/api/generated/client.ts",
      schemas: "./src/api/generated/models",
      client: "fetch",
      mode: "split",
      clean: true,
      mock: {
        generators: [
          {
            type: "faker",
            path: "./src/api-mocks/generated",
            schemas: false,
            operationResponses: true,
            generateEachHttpStatus: true,
            useExamples: true,
          },
        ],
      },
      override: {
        mock: {
          arrayMin: 1,
          arrayMax: 3,
          fractionDigits: 2,
        },
      },
    },
  },
  tycheApiValidation: {
    input: { target: "../api/api/openapi.yaml" },
    output: {
      target: "./src/api/generated/validation.ts",
      client: "zod",
      mode: "single",
      override: {
        zod: {
          version: 4,
          generate: {
            body: false,
            header: false,
            param: true,
            query: true,
            response: true,
          },
        },
      },
    },
  },
});
