require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Wysyła panel ticketów"),

  new SlashCommandBuilder()
    .setName("weryfikacja")
    .setDescription("Wysyła panel weryfikacji"),

  new SlashCommandBuilder()
    .setName("cennik")
    .setDescription("Wysyła dropdown z cennikiem"),

  new SlashCommandBuilder()
    .setName("drop")
    .setDescription("Losuje zniżkę"),

  new SlashCommandBuilder()
  .setName("konkurs")
  .setDescription("Tworzy konkurs")
  .addStringOption((option) =>
    option
      .setName("nagroda")
      .setDescription("Co można wygrać?")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("czas")
      .setDescription("Czas trwania konkursu w minutach")
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
    console.log("Czyszczenie globalnych komend...");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });

    console.log("Dodawanie komend na serwer...");

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("Komendy zostały dodane.");
  } catch (error) {
    console.error("Błąd przy dodawaniu komend:", error);
  }
})();
