exports.run = async (client, msg) => {
    const { ChannelType } = require('discord.js');
    if (msg.author.bot) return;
    if (msg.channel.type !== ChannelType.DM && client.config.channelname !== "")
        if (msg.channel.name.toLowerCase() !== client.config.channelname.toLowerCase()) return;
    if (msg.channel.type !== ChannelType.DM && !msg.content.trim().replace(/ /g, '').startsWith(client.config.commandprefix)) return;
    
    let args = msg.content.split(/ +/);
    if (msg.channel.type !== ChannelType.DM) args = msg.content.slice(client.config.commandprefix.length).split(/ +/);

    const command = args.shift().toLowerCase();

    if (!client.commands[command])
        if (client.config.unknowncommandresponse === 'true')
            return client.reply(msg, `Unknown command. Use ${client.config.commandprefix}help to view the commands list!`);
        else return;

    if (!msg.inGuild() && client.commands[command].guildOnly) return;
    if (!client.commands[command].hasPermission(msg.author)) return;
    
    client.commands[command].run(msg, args);
}
