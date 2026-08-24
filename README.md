# Consulta CNPJ — React + Tailwind

Frontend responsivo para consultar a API pública do CNPJ.ws:

`GET https://publica.cnpj.ws/cnpj/{cnpj}`

## Recursos

- Máscara automática de CNPJ e validação dos dígitos verificadores
- Loading, timeout e tratamento de HTTP 404 / 429 / erros genéricos
- Resumo com razão social, fantasia, situação, endereço, cidade/UF, CNAE, telefones, e-mail, capital social e inscrições estaduais
- Renderizador recursivo para qualquer JSON: objetos, listas, listas de objetos, valores nulos e campos novos
- JSON bruto em modal
- Copiar JSON
- Contador de campos preenchidos / total de folhas do JSON
- Formatação automática de CNPJ, CEP, datas, booleanos e capital social
- Sem biblioteca externa de ícones

## Executar

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

> A API pública do CNPJ.ws aceita o CNPJ sem caracteres especiais e possui limite público de consultas. O frontend trata resposta HTTP 429 com mensagem específica.
