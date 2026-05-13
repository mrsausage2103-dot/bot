require("dotenv").config();

const express = require("express");
const {
  Client,
  GatewayIntentBits,
  ActivityType,
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
const VERIFIED_ROLE_ID_2 = "1503706292189921481";
const LINK_ALLOWED_ROLE_ID = "1503847409506058361";


const ticketNames = {
  zakup: "zakup",
  skup: "skup",
  index: "index",
  middleman: "middleman",
  pomoc: "pomoc",
};

const konkursy = new Map();

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

async function zakonczKonkurs(konkursId) {
  const konkurs = konkursy.get(konkursId);
  if (!konkurs) return;

  konkursy.delete(konkursId);

  const channel = await client.channels.fetch(konkurs.channelId).catch(() => null);
  if (!channel) return;

  const message = await channel.messages.fetch(konkurs.messageId).catch(() => null);

  const disabledButton = new ButtonBuilder()
    .setCustomId(`konkurs_join_${konkursId}`)
    .setLabel("Konkurs zakończony")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

  if (message) {
    await message.edit({ components: [disabledRow] }).catch(() => null);
  }

  if (konkurs.uczestnicy.size === 0) {
    return channel.send(
      `🎉 Konkurs **${konkurs.nagroda}** zakończony. Nikt nie wziął udziału.`
    );
  }

  const uczestnicy = Array.from(konkurs.uczestnicy);
  const zwyciezcaId = uczestnicy[Math.floor(Math.random() * uczestnicy.length)];

  return channel.send(
    `🎉 Konkurs **${konkurs.nagroda}** zakończony!\n🏆 Zwycięzca: <@${zwyciezcaId}>`
  );
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
        text: "`PixelCoreShop × TICKETY`",
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

  client.user.setPresence({
    activities: [
      {
        name: "PixelCoreShop",
        type: ActivityType.Watching,
      },
    ],
    status: "online",
  });
});


client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return;
  }

  if (message.member.roles.cache.has(LINK_ALLOWED_ROLE_ID)) {
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
  if (interaction.isChatInputCommand()) {
    const adminOnlyCommands = ["tickets", "cennik", "weryfikacja", "konkurs"];

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
      const nagroda = interaction.options.getString("nagroda") || "Nagroda";
      const opis =
        interaction.options.getString("opis") ||
        "Kliknij przycisk poniżej, aby wziąć udział.";
      const czas = interaction.options.getInteger("czas") || 10;

      const konkursId = `${Date.now()}`;
      const koniec = Math.floor((Date.now() + czas * 60 * 1000) / 1000);

      const joinButton = new ButtonBuilder()
        .setCustomId(`konkurs_join_${konkursId}`)
        .setLabel("Weź udział")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(joinButton);

      const embed = new EmbedBuilder()
        .setColor("#800080")
        .setTitle("`🎉 PixelCoreShop × KONKURS`")
        .addFields(
          { name: "🎁 Nagroda", value: `**${nagroda}**`, inline: false },
          { name: "⏰ Czas", value: `**${czas} minut**`, inline: true },
          { name: "📅 Koniec", value: `<t:${koniec}:R>`, inline: true },
          { name: "📋 Opis", value: opis, inline: false }
        )
        .setFooter({
          text: "PixelCoreShop × KONKURSY",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      await interaction.reply({
        embeds: [embed],
        components: [row],
      });

      const message = await interaction.fetchReply();

      konkursy.set(konkursId, {
        nagroda,
        opis,
        uczestnicy: new Set(),
        channelId: message.channel.id,
        messageId: message.id,
      });

      setTimeout(() => {
        zakonczKonkurs(konkursId);
      }, czas * 60 * 1000);

      return;
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

      const embed = new EmbedBuilder()
        .setColor("#800080")
        .setTitle("`✅ PixelCoreShop × WERYFIKACJA`")
        .setDescription("Kliknij przycisk poniżej, aby się zweryfikować.")
        .setFooter({
          text: "© 2026 PixelCoreShop × WERYFIKACJA",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      return interaction.reply({
        embeds: [embed],
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
        .setTitle("`💰 PixelCoreShop × CENNIK`")
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
        .setTitle("`🎫 PixelCoreShop × TICKETY`")
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
      return interaction.reply({
        content: "odp",
        ephemeral: true,
      });
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
        .setPlaceholder("np. SAB, Robux, PS99")
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
        .setPlaceholder("np. BLIK, PayPal, PSC")
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
    if (interaction.customId.startsWith("konkurs_join_")) {
      const konkursId = interaction.customId.replace("konkurs_join_", "");
      const konkurs = konkursy.get(konkursId);

      if (!konkurs) {
        return interaction.reply({
          content: "Ten konkurs już się zakończył.",
          ephemeral: true,
        });
      }

      if (konkurs.uczestnicy.has(interaction.user.id)) {
        return interaction.reply({
          content: "Już bierzesz udział w tym konkursie.",
          ephemeral: true,
        });
      }

      konkurs.uczestnicy.add(interaction.user.id);

      return interaction.reply({
        content: `Dołączyłeś do konkursu o **${konkurs.nagroda}**!`,
        ephemeral: true,
      });
    }

    if (interaction.customId === "verify") {
      const member = interaction.member;

      const role = await interaction.guild.roles
        .fetch(VERIFIED_ROLE_ID)
        .catch(() => null);

      const role2 = await interaction.guild.roles
        .fetch(VERIFIED_ROLE_ID_2)
        .catch(() => null);

      if (!role || !role2) {
        return interaction.reply({
          content:
            "Nie znaleziono jednej z ról weryfikacyjnych. Sprawdź ID ról i czy bot jest na dobrym serwerze.",
          ephemeral: true,
        });
      }

      if (
        member.roles.cache.has(VERIFIED_ROLE_ID) &&
        member.roles.cache.has(VERIFIED_ROLE_ID_2)
      ) {
        return interaction.reply({
          content: "Już jesteś zweryfikowany.",
          ephemeral: true,
        });
      }

      await member.roles.add([role, role2]);

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
