// : ! Synora 乂 Development !
// + Discord: its2yashpatel_
// + Cộng đồng: https://dsc.gg/synoraxdev (Synora 乂 Development)
// + Nếu có thắc mắc, hãy liên hệ qua Cộng đồng hoặc DM tôi.

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

function statusLabel(ws) {
  if (ws < 80)  return { text: 'Siêu nhanh — không có gì phải phàn nàn', color: 0x57F287 };
  if (ws < 150) return { text: 'Kết nối ổn định, mọi thứ đều tốt', color: 0x57F287 };
  if (ws < 250) return { text: 'Hơi chậm một chút, nhưng vẫn ổn', color: 0xFEE75C };
  return { text: 'Đang quá tải — có thể gặp trục trặc', color: 0xED4245 };
}

function buildPingCard(ws, rest, avatar) {
  const { text, color } = statusLabel(ws);
  const c = new ContainerBuilder().setAccentColor(color);

  c.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${getEmoji('ping')} Kiểm tra Độ trễ\n-# ${text}`,
        ),
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
  );

  c.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
  );

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${getEmoji('info')} **Nhịp tim WebSocket** — \`${ws}ms\`\n${getEmoji('arrow')} **Khứ hồi REST** — \`${rest}ms\``,
    ),
  );

  c.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
  );

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${ws < 150 ? getEmoji('success') + ' Mọi hệ thống đều hoạt động bình thường' : ws < 250 ? getEmoji('warning') + ' Phát hiện độ trễ nhẹ' : getEmoji('error') + ' Độ trễ cao — hãy để mắt tới nó'}`,
    ),
  );

  return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Kiểm tra độ trễ của bot'),
  prefix: 'ping',

  async execute(interaction) {
    const ws = interaction.client.ws.ping;
    const t = Date.now();
    await interaction.deferReply();
    const rest = Date.now() - t;
    const avatar = interaction.client.user.displayAvatarURL({ size: 128, extension: 'png' });
    await interaction.editReply(buildPingCard(ws, rest, avatar));
  },

  async prefixExecute(message, _a, client) {
    const ws = client.ws.ping;
    const t = Date.now();
    const sent = await message.reply('...');
    const rest = Date.now() - t;
    const avatar = client.user.displayAvatarURL({ size: 128, extension: 'png' });
    await sent.edit({ content: '', ...buildPingCard(ws, rest, avatar) });
  },
};

// : ! Synora 乂 Development !
// + Discord: its2yashpatel_
// + Cộng đồng: https://dsc.gg/synoraxdev (Synora 乂 Development)
// + Nếu có thắc mắc, hãy liên hệ qua Cộng đồng hoặc DM tôi.
