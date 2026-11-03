# EcoSmart Saúde

Agendamento inteligente para a **Clínica LEAC** · Universidade Positivo, campus Ecoville.
Protótipo **somente frontend** (dados fictícios em `localStorage`).

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

> Coloque os arquivos oficiais do logo em `public/brand/positivo-logo.png` e `public/brand/positivo-estrela.png`.
> Enquanto não existirem, o app mostra o texto "Universidade Positivo" no lugar.

## Roteiro da demo

1. **Aba 1 (DevTools → modo celular):** `/paciente/entrar` → "Gerar CPF novo" → cadastro (sexo **Feminino**) →
   escolha **Hemograma, Glicose e PSA** → preferência → **Enviar solicitação**. A tela de espera fica aberta.
2. **Aba 2 (desktop):** `/equipe/entrar` → **Maria Souza**. A solicitação chega na fila com toast e destaque.
   Selecione, pressione **A** para assumir → aparece o **bloqueio do PSA** → "Trocar exame" com motivo →
   escolha uma sugestão de horário → **Enter** → **Confirmar agendamento**.
3. **Aba 1:** a espera vira o **comprovante** sozinha (QR Code, preparo "Jejum de 8 horas", aviso da alteração).
4. **Agenda** e **Dashboard** já mostram o novo agendamento.

CPF de paciente já cadastrada (Ana Clara): `451.245.085-82`. Código de verificação: qualquer um (ex.: `123456`).
Para recomeçar: menu do usuário → **Reiniciar dados da demo** (ou o link na tela inicial).

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `app/paciente/*` | Visão do paciente (mobile-first) |
| `app/equipe/entrar`, `app/equipe/(app)/*` | Visão da equipe (fila, agenda, pacientes, exames, dashboard) |
| `lib/types.ts` | Tipos do domínio |
| `lib/mock-data.ts` | 28 exames, 15 pacientes, equipe, agenda e seed relativo à data atual |
| `lib/rules.ts` | Alertas, agrupamento por coleta, preparo consolidado, sugestão de horários |
| `lib/store.ts` | Zustand persistido + sincronizado entre abas (evento `storage`) |
| `components/shared` | StatusBadge, ExamChip, AlertItem, TimelineItem, SlotCard, EmptyState, marca |
| `components/paciente` | TicketCard, formulário de cadastro, preparo em destaque |
| `components/equipe` | Shell, fila, análise, painel de agendamento, diálogos |

Preparos e tempos de jejum são **fictícios** e devem ser validados pelos supervisores da LEAC.
