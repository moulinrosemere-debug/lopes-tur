# Lopes Tur

Aplicativo web estático para acompanhar ganhos, despesas e lucro líquido de um carro usado para trabalhar com Uber.

## Publicar no GitHub Pages

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **Deploy from a branch**, escolha a branch `main` e a pasta `/ (root)`.
3. Salve e aguarde o endereço do seu aplicativo aparecer.

Os dados ficam salvos apenas no navegador usado. A função de exportação gera uma planilha CSV para você guardar um backup.

## Funcionalidades

- **Painel**: resumo de ganhos, gastos e lucro líquido por período (hoje, 7 dias, mês ou tudo), com os últimos lançamentos.
- **Ganhos**: cadastro por plataforma (Uber, 99, particular, outro), com valor, corridas e km rodado.
- **Gastos**: cadastro por categoria (combustível, manutenção, IPVA, seguro, etc.), com litros e odômetro quando aplicável.
- **Relatórios**: gráficos de ganhos x gastos por mês, gastos por categoria e ganhos por plataforma.
- **Ajustes**: dados do motorista/veículo, exportação em CSV e opção de apagar todos os dados.
- Todo lançamento (ganho ou gasto) pode ser **editado** ou **excluído** a qualquer momento, direto na lista.
