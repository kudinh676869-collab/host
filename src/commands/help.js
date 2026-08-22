import {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
} from 'discord.js';
import { getEmoji } from '../handlers/emoji.js';
import { PREFIX } from '../utils/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('See all available commands'),
    prefix: 'help',

    async execute(interaction) {
        await interaction.reply(buildHelp(interaction.user, interaction.client));
    },

    async prefixExecute(message, _a, client) {
        await message.reply(buildHelp(message.author, client));
    },
};

function buildHelp(user, client) {
    const avatar = user.displayAvatarURL({ size: 128, extension: 'png' });
    const botAvatar = client.user.displayAvatarURL({ size: 128, extension: 'png' });
    const c = new ContainerBuilder().setAccentColor(0x5865F2);

    // ── 𝙊𝙬𝙣𝙚𝙧:𝙇𝙚𝙚 𝙈𝙞𝙣𝙝 𝘽𝙤𝙣&𝙉𝙜𝙗𝙖𝙘𝙝 ──────────────────────────────────────────────────────────────
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# 🤖 𝙌𝙪𝙚𝙨𝙩 𝘽𝙤𝙩 𝘽𝙮 𝘼𝙀𝙃𝘽 𝙏𝙀𝘼𝙈\n-# Hey **${user.username}**, https://discord.gg/anhemhobach`,
                ),
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(botAvatar)),
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // ── 𝘾𝙝𝙪̛́𝙘 𝙉𝙖̆𝙣𝙜 𝙏𝙤𝙠𝙚𝙣 ────────────────────────────────────────────────────────
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `🔗 **T̐̈o̐̈k̐̈e̐̈n̐̈**\n` +
            `\`/link\`  \`${PREFIX}link\` — 𝐍𝐡𝐚̣̂𝐩 𝐓𝐨𝐤𝐞𝐧 𝐂𝐮̉𝐚 𝐁𝐚𝐧 𝐕𝐚̀𝐨 Đ𝐞̂̉ 𝐋𝐚̀𝐦 𝐐𝐮𝐞𝐬𝐭(𝐀𝐧𝐡 𝐄𝐦 𝐇𝐨̣ 𝐁𝐚́𝐜𝐡)\n` +
            `\`/unlink\`  \`${PREFIX}unlink\` — 𝐗𝐨́𝐚 𝐓𝐨𝐤𝐞𝐧 Đ𝐚̃ 𝐋𝐮̛𝐮(𝐀𝐧𝐡 𝐄𝐦 𝐇𝐨̣ 𝐁𝐚́𝐜𝐡)\n` +
            `\`/tokencheck\`  \`${PREFIX}tokencheck\` — 𝐊𝐢𝐞̂̉𝐦 𝐓𝐫𝐚 𝐓𝐨𝐤𝐞𝐧 𝐂𝐨̀𝐧 𝐒𝐨̂́𝐧𝐠 𝐇𝐚𝐲 𝐊𝐡𝐨̂𝐧𝐠`,
        ),
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // ── C̶h̶ứ̶c̶ ̶N̶ă̶n̶g̶ ̶Q̶u̶e̶s̶t̶ ────────────────────────────────────────────────────────
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `🎮 **𝙌𝙪𝙚𝙨𝙩𝙨**\n` +
            `\`/quest\`  \`${PREFIX}quest\` — 𝐂𝐡𝐨̣𝐧 𝐕𝐚̀ 𝐋𝐚̀𝐦 𝟏 𝐐𝐮𝐞𝐬𝐭 𝐃𝐮𝐲 𝐍𝐡𝐚̂́𝐭\n` +
            `\`/questall\`  \`${PREFIX}questall\` — 𝐿𝑎̀𝑚 𝑇𝑎̂́𝑡 𝐶𝑎̉ 𝑄𝑢𝑒𝑠𝑡 𝐿𝑢𝑛 𝑁ℎ𝑜𝑎𝑎𝑎\n` +
            `\`/questlist\`  \`${PREFIX}questlist\` — 𝑿𝒆𝒎 𝑻𝒂̂́𝒕 𝑪𝒂̉ 𝑸𝒖𝒆𝒔𝒕 Đ𝒂̃ 𝑳𝒂̀𝒎 𝑯𝒂𝒚 𝑪𝒉𝒖̛𝒂 𝑳𝒂̀𝒎 & status\n` +
            `\`/autoquest\`  \`${PREFIX}autoquest\` — 𝗦𝗮̀𝗶 𝗟𝗲̣̂𝗻𝗵 𝗡𝗮̀𝘆 𝗦𝗲̃ 𝗧𝘂̛̣ Đ𝗼̣̂𝗻𝗴 𝗟𝗮̀𝗺 𝗤𝘂𝗲𝘀𝘁 𝗡𝗲̂́𝘂 𝗗𝗶𝘀𝗰𝗼𝗿𝗱 𝗖𝗼́ 𝗤𝘂𝗲𝘀𝘁 𝗠𝗼̛́𝗶(𝗟𝘂̛𝘂 𝘆́: 𝗧𝗼𝗸𝗲𝗻 𝗞𝗼 Đ𝗰 Đ𝗼̂̉𝗶)`,
        ),
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // ── Ｃｈứｃ Ｎăｎｇ Ｔｉệｎ Íｃｈ ──────────────────────────────────────────────────────
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `🛠️ **𝕋𝕚𝕖̣̂𝕟 𝕀́𝕔𝕙**\n` +
            `\`/ping\`  \`${PREFIX}ping\` — 𝔎𝔦𝔢̂̉𝔪 𝔗𝔯𝔞 Đ𝔬̣̂ ℭ𝔥𝔞̣̂𝔪 𝔗𝔯𝔢̂̃ ℭ𝔲̉𝔞 𝔅𝔬𝔱\n` +
            `\`/help\`  \`${PREFIX}help\` — 𝗕𝗮̂́𝗺 Đ𝗲̂̉ 𝗛𝘂̛𝗼̛́𝗻𝗴 𝗗𝗮̂̃𝗻`,
        ),
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    // ── Footer ───────────────────────────────────────────────────────────────
    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# 🌐 Đ𝕒𝕟𝕘 ℙ𝕙𝕦̣𝕔 𝕍𝕦̣ ℂ𝕙𝕠 **${client.guilds.cache.size}** server(s)  ·  Prefix: \`${PREFIX}\``,
                ),
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
    );

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}
