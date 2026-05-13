require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
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
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Rejestrowanie komend...");

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("Komendy zarejestrowane.");
  } catch (error) {
    console.error(error);
  }
})();
