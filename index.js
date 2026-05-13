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
  SlashCommandBuilder,
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
const tworzoneTickety = new Set();

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

function isTicketChannel(channel) {
  return channel?.type === ChannelType.GuildText && channel.name.startsWith("ticket-");
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
  const lockKey = `${interaction.guild.id}:${interaction.user.id}`;

  if (tworzoneTickety.has(lockKey)) {
    return interaction.reply({
      content: "❌ Ticket jest już tworzony, poczekaj chwilę.",
      ephemeral: true,
    });
  }

  tworzoneTickety.add(lockKey);

  try {
    const existing = interaction.guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.topic?.includes(`User: ${interaction.user.id}`) &&
        c.name.startsWith(`ticket-${categoryName}-`)
    );

    if (existing) {
      return interaction.reply({
        content: "❌ ᴍᴀꜱᴢ ᴊᴜᴢ̇ ᴏᴛᴡᴀʀᴛʏ ᴛɪᴄᴋᴇᴛ!",
        ephemeral: true,
      });
    }

    const userName = cleanName(interaction.user.username);

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
  } finally {
    tworzoneTickety.delete(lockKey);
  }
}

client.once("ready", async () => {
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

  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName("tickets")
      .setDescription("Wysyła panel ticketów"),
    new SlashCommandBuilder()
      .setName("cennik")
      .setDescription("Wysyła panel cennika"),
    new SlashCommandBuilder()
      .setName("weryfikacja")
      .setDescription("Wysyła panel weryfikacji"),
    new SlashCommandBuilder()
      .setName("drop")
      .setDescription("Losuje drop"),
    new SlashCommandBuilder()
      .setName("close")
      .setDescription("Zamyka aktualny ticket"),
    new SlashCommandBuilder()
      .setName("claim")
      .setDescription("Przejmuje aktualny ticket"),
    new SlashCommandBuilder()
      .setName("konkurs")
      .setDescription("Tworzy konkurs")
      .addStringOption((option) =>
        option
          .setName("nagroda")
          .setDescription("Nagroda w konkursie")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("czas")
          .setDescription("Czas konkursu w minutach")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("opis")
          .setDescription("Opis konkursu")
          .setRequired(false)
      ),
  ]);

  console.log("Komendy zostały zarejestrowane");
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
    if (interaction.commandName === "close") {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: "❌ Tej komendy możesz użyć tylko na tickecie.",
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "🗑️ Ticket zostanie zamknięty za 3 sekundy...",
      });

      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 3000);

      return;
    }

    if (interaction.commandName === "claim") {
      if (!isTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: "❌ Tej komendy możesz użyć tylko na tickecie.",
          ephemeral: true,
        });
      }

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: "❌ Nie masz uprawnień do claimowania ticketów.",
          ephemeral: true,
        });
      }

      if (interaction.channel.topic?.includes("Claimed by:")) {
        return interaction.reply({
          content: "❌ Ten ticket jest już przejęty.",
          ephemeral: true,
        });
      }

      await interaction.channel.setTopic(
        `${interaction.channel.topic || ""} | Claimed by: ${interaction.user.id}`
      );

      const embed = new EmbedBuilder()
        .setColor("#800080")
        .setTitle("🎫 Ticket przejęty")
        .setDescription(`Ten ticket został przejęty przez ${interaction.user}.`)
        .setFooter({
          text: "PixelCoreShop × TICKETY",
          iconURL: interaction.guild.iconURL({ dynamic: true }),
        });

      return interaction.reply({
        embeds: [embed],
      });
    }

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
          { name: "📋 Opis", value: opis, inline: false },
          { name: "👥 Uczestnicy", value: "**0**", inline: true }
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
          },
          {
            label: "【🎲】〉 mystery-sab",
            description: "sab",
            value: "opcja_2",
          },
          {
            label: "【🏠】〉 index-bazy",
            description: "sab",
            value: "opcja_3",
          },
          {
            label: "【🔫】〉 case-paradise",
            description: "case",
            value: "opcja_4",
          },
          {
            label: "【😺】〉 Ps99",
            description: "ps99",
            value: "opcja_5",
          },
          {
            label: "【💲】〉 robux",
            description: "robux",
            value: "opcja_6",
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

      const existing = interaction.guild.channels.cache.find(
        (c) =>
          c.type === ChannelType.GuildText &&
          c.topic?.includes(`User: ${interaction.user.id}`) &&
          c.name.startsWith(`ticket-${categoryName}-`)
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

      const channel = await client.channels.fetch(konkurs.channelId).catch(() => null);
      const message = await channel?.messages.fetch(konkurs.messageId).catch(() => null);

      if (message?.embeds[0]) {
        const updatedEmbed = EmbedBuilder.from(message.embeds[0]);

        const fields = message.embeds[0].fields.map((field) =>
          field.name === "👥 Uczestnicy"
            ? {
                name: "👥 Uczestnicy",
                value: `**${konkurs.uczestnicy.size}**`,
                inline: true,
              }
            : field
        );

        updatedEmbed.setFields(fields);
        await message.edit({ embeds: [updatedEmbed] }).catch(() => null);
      }

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
      if (!isTicketChannel(interaction.channel)) {
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
