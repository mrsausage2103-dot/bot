require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const app = express();

app.get("/", (req, res) => {
  res.send("Bot działa");
});

app.listen(3000, () => {
  console.log("Serwer HTTP działa");
});

const VERIFIED_ROLE_ID = "1503722955312599040";

const ticketNames = {
  zakup: "zakup",
  skup: "skup",
  index: "index",
  middleman: "middleman",
  pomoc: "pomoc",
};

const konkursUczestnicy = new Set();
let konkursAktywny = false;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});


function cleanName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
}

async function createTicket(interaction, choice, answers = null) {
  if (!interaction.guild) return;

  const categoryName = ticketNames[choice] || "ticket";
  const userName = cleanName(interaction.user.username);

  const existing = interaction.guild.channels.cache.find(
    (c) => c.name === `ticket-${categoryName}-${userName}`
  );

  if (existing) {
    return interaction.reply({
      content: "❌ ᴍᴀꜱᴢ ᴊᴜᴢ̇ ᴏᴛᴡᴀʀᴛʏ ᴛɪᴄᴋᴇᴛ!",
      ephemeral: true,
    });
  }

  try {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${categoryName}-${userName}`,
      type: ChannelType.GuildText,
      topic: `Ticket: ${choice} | User: ${interaction.user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ],
    });

    const closeButton = new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Zamknij ticket")
      .setStyle(ButtonStyle.Danger);

    const closeRow = new ActionRowBuilder().addComponents(closeButton);

    let description = `👤 Autor: ${interaction.user}
📂 Kategoria: **${choice}**

Opisz dokładnie swoją sprawę, a administracja niedługo odpowie.`;

    if (answers) {
      description = `👤 Autor: ${interaction.user}
📂 Kategoria: **${choice}**

🛒 Co chce kupić:
**${answers.item}**

💰 Budżet:
**${answers.budget}**

💳 Metoda płatności:
**${answers.payment}**`;
    }

    const ticketEmbed = new EmbedBuilder()
      .setColor("#800080")
      .setTitle("🎫 Ticket utworzony")
      .setDescription(description)
      .setFooter({
        text: "PixelCoreShop × TICKETY",
        iconURL: interaction.guild.iconURL({ dynamic: true }),
      });

    await channel.send({
      content: "@everyone",
      embeds: [ticketEmbed],
      components: [closeRow],
    });

    return interaction.reply({
      content: `🎫 ᴛɪᴄᴋᴇᴛ ᴜᴛᴡᴏʀᴢᴏɴʏ: ${channel}`,
      ephemeral: true,
    });
  } catch (err) {
    console.error(err);

    return interaction.reply({
      content: "❌ Wystąpił błąd przy tworzeniu ticketa.",
      ephemeral: true,
    });
  }
}

client.once("ready", () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
});
client.once("ready", () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return;
  }

  const linkRegex =
    /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|dc\.gg\/|\.pl|\.com|\.net|\.gg)/i;

  if (linkRegex.test(message.content)) {
    await message.delete().catch(() => null);

    const warning = await message.channel.send({
      content: `${message.author}, nie wysyłaj linków na tym serwerze.`,
    });

    setTimeout(() => {
      warning.delete().catch(() => null);
    }, 5000);
  }
});

client.on("interactionCreate", async (interaction) => {
  console.log(
    "Interaction:",
    interaction.type,
    interaction.commandName || interaction.customId
  );

  // reszta twojego kodu
});


client.on("interactionCreate", async (interaction) => {
  client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return;
  }

  const linkRegex =
    /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite\/|\.pl|\.com|\.net|\.gg)/i;

  if (linkRegex.test(message.content)) {
    await message.delete().catch(() => null);

    const warning = await message.channel.send({
      content: `${message.author}, nie wysyłaj linków na tym serwerze.`,
    });

    setTimeout(() => {
      warning.delete().catch(() => null);
    }, 5000);
  }
});

  console.log(
    "Interaction:",
    interaction.type,
    interaction.commandName || interaction.customId
  );


   if (interaction.isChatInputCommand()) {
  const adminOnlyCommands = ["tickets", "cennik", "weryfikacja", "konkurs", "losuj"];

  if (
    adminOnlyCommands.includes(interaction.commandName) &&
    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return interaction.reply({
      content: "❌ Tylko administrator może używać tej komendy.",
      ephemeral: true,
    });
  }

  if (interaction.commandName === "konkurs") {

      konkursUczestnicy.clear();
      konkursAktywny = true;

      const joinButton = new ButtonBuilder()
        .setCustomId("konkurs_join")
        .setLabel("Weź udział")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(joinButton);

      return interaction.reply({
        content: `🎉 **KONKURS!**

Kliknij przycisk poniżej, aby wziąć udział.`,
        components: [row],
      });
    }

    if (interaction.commandName === "losuj") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "Nie masz permisji do losowania zwycięzcy.",
          ephemeral: true,
        });
      }

      if (!konkursAktywny) {
        return interaction.reply({
          content: "Nie ma aktywnego konkursu.",
          ephemeral: true,
        });
      }

      if (konkursUczestnicy.size === 0) {
        return interaction.reply({
          content: "Nikt nie dołączył do konkursu.",
          ephemeral: true,
        });
      }

      const uczestnicy = Array.from(konkursUczestnicy);
      const zwyciezcaId =
        uczestnicy[Math.floor(Math.random() * uczestnicy.length)];

      konkursAktywny = false;
      konkursUczestnicy.clear();

      return interaction.reply({
        content: `🎉 Zwycięzca konkursu to <@${zwyciezcaId}>!`,
      });
    }

    if (interaction.commandName === "drop") {
      await interaction.deferReply({ ephemeral: true });

      const wygrana = Math.random() < 0.025;

      if (wygrana) {
        return interaction.editReply({
          content: "Gratulacje! Wylosowałeś **1 zł zniżki**!",
        });
      }

      return interaction.editReply({
        content: "Niestety, tym razem nic nie wypadło. Spróbuj ponownie później.",
      });
    }

    if (interaction.commandName === "weryfikacja") {
      const verifyButton = new ButtonBuilder()
        .setCustomId("verify")
        .setLabel("Zweryfikuj się")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(verifyButton);

      return interaction.reply({
        content:
          "ᴋʟɪᴋɴɪᴊ ᴘʀᴢʏᴄɪꜱᴋ ᴘᴏɴɪᴢ̇ᴇᴊ, ᴀʙʏ ꜱɪᴇ̨ ᴢᴡᴇʀʏꜰɪᴋᴏᴡᴀᴄ́.",
        components: [row],
      });
    }

    if (interaction.commandName === "cennik") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("my_dropdown")
        .setPlaceholder("❌ × Nie wybrałeś/aś żadnego cennika")
        .addOptions([
          {
            label: "【🔒】〉 cennik-sab",
            description: "sab",
            value: "opcja_1",
            emoji: { id: "1503754846346543166", name: "emoji_1" },
          },
          {
            label: "【🎲】〉 mystery-sab",
            description: "sab",
            value: "opcja_2",
            emoji: { id: "1503754846346543166", name: "emoji_1" },
          },
          {
            label: "【🏠】〉 index-bazy",
            description: "sab",
            value: "opcja_3",
            emoji: { id: "1503754846346543166", name: "emoji_1" },
          },
          {
            label: "【🔫】〉 case-paradise",
            description: "cp",
            value: "opcja_4",
            emoji: { id: "1503755148097224776", name: "emoji_2" },
          },
          {
            label: "【😺】〉 Ps99",
            description: "ps99",
            value: "opcja_5",
            emoji: { id: "1503755432722698270", name: "emoji_3" },
          },
          {
            label: "【💲】〉 robux",
            description: "robux",
            value: "opcja_6",
            emoji: { id: "1503755696632500395", name: "emoji_4" },
          },
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      const embed = new EmbedBuilder()
        .setColor("#800080")
        .setTitle("💰 PixelCoreShop × CENNIK")
        .setDescription(
          "📋 × Aby zobaczyć cennik wybierz jedną z dostępnych kategorii."
        )
        .setFooter({
          text: "© 2026 PixelCoreShop × CENNIK",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      return interaction.reply({
        embeds: [embed],
        components: [row],
      });
    }

    if (interaction.commandName === "tickets") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_select")
        .setPlaceholder("❌ × Nie wybrałeś/aś żadnej kategorii.")
        .addOptions([
          {
            label: "Zakup",
            description: "Otwórz ticket dotyczący zakupu",
            value: "zakup",
            emoji: "💸",
          },
          {
            label: "Skup",
            description: "Otwórz ticket dotyczący skupu",
            value: "skup",
            emoji: "💰",
          },
          {
            label: "Index",
            description: "Otwórz ticket dotyczący indexu",
            value: "index",
            emoji: "🏠",
          },
          {
            label: "Middleman",
            description: "Otwórz ticket dotyczący middlemana",
            value: "middleman",
            emoji: "🤝",
          },
          {
            label: "Pomoc",
            description: "Otwórz ticket po pomoc administracji",
            value: "pomoc",
            emoji: "📩",
          },
        ]);

      const row = new ActionRowBuilder().addComponents(menu);

      const embed = new EmbedBuilder()
        .setColor("#800080")
        .setTitle("🎫 PixelCoreShop × TICKETY")
        .setDescription(
          "📩 × Aby stworzyć ticketa wybierz jedną z dostępnych kategorii."
        )
        .setFooter({
          text: "© 2026 PixelCoreShop × TICKETY",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      return interaction.reply({
        embeds: [embed],
        components: [row],
      });
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "my_dropdown") {
      const choice = interaction.values[0];

      if (choice === "opcja_1") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }

      if (choice === "opcja_2") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }

      if (choice === "opcja_3") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }

      if (choice === "opcja_4") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }

      if (choice === "opcja_5") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }

      if (choice === "opcja_6") {
        return interaction.reply({
          content: "odp",
          ephemeral: true,
        });
      }
    }

    if (interaction.customId !== "ticket_select") return;
    if (!interaction.guild) return;

    const choice = interaction.values[0];

    if (choice === "zakup") {
      const categoryName = ticketNames[choice] || "ticket";
      const userName = cleanName(interaction.user.username);

      const existing = interaction.guild.channels.cache.find(
        (c) => c.name === `ticket-${categoryName}-${userName}`
      );

      if (existing) {
        return interaction.reply({
          content: "❌ ᴍᴀꜱᴢ ᴊᴜᴢ̇ ᴏᴛᴡᴀʀᴛʏ ᴛɪᴄᴋᴇᴛ!",
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("ticket_zakup_modal")
        .setTitle("Zakup");

      const itemInput = new TextInputBuilder()
  .setCustomId("zakup_item")
  .setLabel("Co chcesz kupić?")
  .setStyle(TextInputStyle.Short)
  .setPlaceholder("❌ x Nie wybrano żadnej opcji")
  .setRequired(true);

const budgetInput = new TextInputBuilder()
  .setCustomId("zakup_budget")
  .setLabel("Jaki masz budżet?")
  .setStyle(TextInputStyle.Short)
  .setPlaceholder("np. 20 zł, 50 zł, 100 zł")
  .setRequired(true);

const paymentInput = new TextInputBuilder()
  .setCustomId("zakup_payment")
  .setLabel("Czym płacisz?")
  .setStyle(TextInputStyle.Short)
  .setPlaceholder("❌ x Nie wybrano żadnej metody płatności")
  .setRequired(true);


      modal.addComponents(
        new ActionRowBuilder().addComponents(itemInput),
        new ActionRowBuilder().addComponents(budgetInput),
        new ActionRowBuilder().addComponents(paymentInput)
      );

      return interaction.showModal(modal);
    }

    return createTicket(interaction, choice);
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === "ticket_zakup_modal") {
      const item = interaction.fields.getTextInputValue("zakup_item");
      const budget = interaction.fields.getTextInputValue("zakup_budget");
      const payment = interaction.fields.getTextInputValue("zakup_payment");

      return createTicket(interaction, "zakup", {
        item,
        budget,
        payment,
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "konkurs_join") {
      if (!konkursAktywny) {
        return interaction.reply({
          content: "Ten konkurs już się zakończył.",
          ephemeral: true,
        });
      }

      if (konkursUczestnicy.has(interaction.user.id)) {
        return interaction.reply({
          content: "Już bierzesz udział w konkursie.",
          ephemeral: true,
        });
      }

      konkursUczestnicy.add(interaction.user.id);

      return interaction.reply({
        content: "Dołączyłeś do konkursu!",
        ephemeral: true,
      });
    }

    if (interaction.customId === "verify") {
      const member = interaction.member;
      const role = await interaction.guild.roles
        .fetch(VERIFIED_ROLE_ID)
        .catch(() => null);

      if (!role) {
        return interaction.reply({
          content:
            "Nie znaleziono roli weryfikacyjnej. Sprawdź ID roli i czy bot jest na dobrym serwerze.",
          ephemeral: true,
        });
      }

      if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
        return interaction.reply({
          content: "Już jesteś zweryfikowany.",
          ephemeral: true,
        });
      }

      await member.roles.add(role);

      return interaction.reply({
        content: "Zostałeś zweryfikowany!",
        ephemeral: true,
      });
    }

    if (interaction.customId === "ticket_close") {
      if (!interaction.channel.name.startsWith("ticket-")) {
        return interaction.reply({
          content: "❌ To nie jest ticket!",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "🗑️ Ticket zostanie zamknięty za 3 sekundy...",
        ephemeral: true,
      });

      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 3000);
    }
  }
});

client.login(process.env.TOKEN);
