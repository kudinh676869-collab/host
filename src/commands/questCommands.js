import {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    Colors,
} from 'discord.js';
import { QuestClient } from '../quest/questClient.js';
import { TokenStore } from '../quest/tokenStore.js';
import { enableAutoquest, disableAutoquest, isAutoquestEnabled } from '../quest/autoquestStore.js';
import { PREFIX } from '../utils/config.js';

// ── TokenStore (phiên bản dùng chung qua BOT_TOKEN làm bí mật) ───────────────────
export function makeTokenStore(secret) {
    return new TokenStore(secret);
}

// ── Hàm trợ giúp ────────────────────────────────────────────────────────────────

function sanitizeToken(raw) {
    return raw.trim()
        .replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
        .replace(/^`+|`+$/g, '')
        .replace(/^Bot\s+/i, '')
        .trim();
}

function isValidUserToken(token) {
    return token.length >= 50 && /^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(token);
}

// ── Trình tạo giao diện (Component V2) ─────────────────────────────────────────────

function buildLinkModal() {
    const modal = new ModalBuilder()
        .setCustomId('link_token_modal')
        .setTitle('Liên kết Token Discord của bạn');
    modal.addComponents(
        new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('link_token_input')
                .setLabel('Token người dùng Discord của bạn')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Dán token của bạn vào đây...')
                .setRequired(true),
        ),
    );
    return modal;
}

function buildLinkPrompt() {
    const c = new ContainerBuilder().setAccentColor(0xFEE75C);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# 🔗 Cần Token\nBạn cần liên kết token Discord trước khi sử dụng lệnh nhiệm vụ.\n\nNhấn **Liên kết Token** bên dưới — một cửa sổ bật lên sẽ xuất hiện để bạn dán token.\n\n**Cách lấy token của bạn:**\n\`1.\` Mở Discord trong **trình duyệt** (không phải ứng dụng)\n\`2.\` Nhấn \`Ctrl+Shift+I\` → Tab **Network** → lọc \`XHR\`\n\`3.\` Gửi bất kỳ tin nhắn nào, nhấp vào yêu cầu, tìm \`Authorization\` trong headers\n\`4.\` Sao chép giá trị đó và dán vào cửa sổ bật lên\n\n> ⚠️ Đây là **token người dùng** của bạn, KHÔNG phải token bot.`,
        ),
    );
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addActionRowComponents(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('link_prompt')
                .setLabel('🔗 Liên kết Token')
                .setStyle(ButtonStyle.Primary),
        ),
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildNoQuestsCard() {
    const c = new ContainerBuilder().setAccentColor(0x4F545C);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# 🔍 Không có Nhiệm vụ\nHiện tại không có nhiệm vụ nào đang hoạt động hoặc chưa hoàn thành trên tài khoản của bạn.`,
        ),
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildExpiredTokenCard() {
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# ❌ Token Hết hạn\nToken đã lưu của bạn bị Discord từ chối — có thể đã hết hạn.\n\n**Token của bạn đã bị xóa.** Liên kết lại với \`/link\` hoặc \`${PREFIX}link\`.`,
        ),
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildErrorCard(err) {
    const msg = err?.message ?? String(err);
    const is401 = msg.includes('401');
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            is401
                ? `# ❌ Token Không hợp lệ hoặc Hết hạn\nLiên kết lại token với \`${PREFIX}link\`.`
                : `# ❌ Lỗi\n${msg.slice(0, 800)}`,
        ),
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildQuestSelectCard(quests) {
    const ICONS = {
        PLAY_ON_DESKTOP: '🖥️', WATCH_VIDEO: '🎬', STREAM_ON_DESKTOP: '📺',
        PLAY_ACTIVITY: '🎮', WATCH_VIDEO_ON_MOBILE: '📱',
    };

    const lines = quests.map((q, i) => {
        const tasks = (q.config.task_config ?? q.config.task_config_v2)?.tasks ?? {};
        const taskKey = Object.keys(tasks)[0] ?? '';
        const icon = ICONS[taskKey] ?? '⚙️';
        const exp = Math.floor(new Date(q.config.expires_at).getTime() / 1000);
        return `**${i + 1}.** ${icon} **${q.config.messages.quest_name}**\n> *${q.config.messages.game_title}*  •  Hết hạn <t:${exp}:R>`;
    }).join('\n\n');

    const c = new ContainerBuilder().setAccentColor(0x5865F2);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# 🎮 ${quests.length} Nhiệm vụ Có sẵn\n${lines}\n\n*Sử dụng menu thả xuống bên dưới để chọn một nhiệm vụ.*`,
        ),
    );
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    const menu = new StringSelectMenuBuilder()
        .setCustomId(`quest_select_${Date.now()}`)
        .setPlaceholder('Chọn một nhiệm vụ...')
        .addOptions(
            quests.map((q) => {
                const tasks = (q.config.task_config ?? q.config.task_config_v2)?.tasks ?? {};
                const taskKey = Object.keys(tasks)[0] ?? '';
                return {
                    label: q.config.messages.quest_name.slice(0, 100),
                    description: q.config.messages.game_title.slice(0, 100),
                    value: q.id,
                    emoji: ICONS[taskKey] ?? '⚙️',
                };
            }),
        );

    c.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

function buildQuestInfoCard(quest, phase, claimed = 0, failReason = '') {
    const cfg  = quest.config;
    const msgs = cfg.messages;
    const appId = cfg.application.id;

    const thumbUrl = `https://cdn.discordapp.com/app-assets/${appId}/quest-assets/${cfg.assets.game_tile}.png`;

    const TASK_META = {
        PLAY_ON_DESKTOP:       { icon: '🖥️', label: 'Chơi trên Máy tính' },
        WATCH_VIDEO:           { icon: '🎬', label: 'Xem Video' },
        STREAM_ON_DESKTOP:     { icon: '📺', label: 'Phát trực tiếp trên Máy tính' },
        PLAY_ACTIVITY:         { icon: '🎮', label: 'Chơi Hoạt động' },
        WATCH_VIDEO_ON_MOBILE: { icon: '📱', label: 'Xem Video trên Điện thoại' },
    };

    const taskLines = Object.entries((cfg.task_config ?? cfg.task_config_v2)?.tasks ?? {}).map(([type, task]) => {
        const meta = TASK_META[type] ?? { icon: '⚙️', label: type };
        let dur = '';
        if (type === 'PLAY_ON_DESKTOP' || type === 'STREAM_ON_DESKTOP') {
            dur = `  •  **${Math.ceil(task.target / 60)} phút**`;
        } else if (type === 'WATCH_VIDEO' || type === 'WATCH_VIDEO_ON_MOBILE') {
            const s = task.target;
            dur = s >= 60 ? `  •  **${Math.ceil(s / 60)} phút**` : `  •  **${s} giây**`;
        }
        return `${meta.icon} ${meta.label}${dur}${phase === 'done' ? '  ✅' : ''}`;
    });

    const rewardLines = cfg.rewards_config.rewards.map((r) => {
        let line = `**${r.messages.name}**`;
        if (r.orb_quantity) line += `  ✦ *(${r.orb_quantity} Orb)*`;
        else if (r.quantity) line += `  *(${r.quantity} ngày Nitro)*`;
        return line;
    });

    const expiresEpoch = Math.floor(new Date(cfg.expires_at).getTime() / 1000);
    const daysLeft = Math.max(0, Math.ceil((new Date(cfg.expires_at).getTime() - Date.now()) / 86400000));

    const PHASE = {
        starting: { color: 0x5865F2, title: '⚙️  Đang xử lý Nhiệm vụ...',  bar: '`░░░░░░░░░░`  **0%**  —  *Đang xử lý...*' },
        done:     { color: 0x57F287, title: '✅  Nhiệm vụ Hoàn thành!',    bar: '`██████████`  **100%**' },
        failed:   { color: 0xED4245, title: '❌  Nhiệm vụ Thất bại',       bar: '' },
    };

    const p = PHASE[phase];
    const progressText = phase === 'failed' && failReason
        ? `\`░░░░░░░░░░\`  **0%**\n\`\`\`\n${failReason.slice(0, 300)}\n\`\`\``
        : p.bar;

    const footerNote = phase === 'done' && claimed > 0
        ? `-# 🎁 Đã nhận ${claimed} phần thưởng`
        : phase === 'starting'
        ? `-# Quest Bot  •  Vui lòng đợi...`
        : phase === 'failed'
        ? `-# Cần hoàn thành thủ công trong ứng dụng Discord`
        : '';

    const c = new ContainerBuilder().setAccentColor(p.color);

    c.addSectionComponents(
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ${p.title}\n### ${msgs.quest_name}\n*${msgs.game_title}*  •  ${msgs.game_publisher}`,
                ),
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl)),
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `📋 **Nhiệm vụ**\n${taskLines.join('\n') || '*Không xác định*'}\n\n` +
            `📅 **Hết hạn**  <t:${expiresEpoch}:R>  *(${daysLeft} ngày còn)*\n\n` +
            `📊 **Tiến độ**\n${progressText || '`░░░░░░░░░░`  0%'}\n\n` +
            `🎁 **Phần thưởng**\n${rewardLines.join('\n') || '*Không có phần thưởng*'}`,
        ),
    );

    if (footerNote) {
        c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(footerNote));
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// ── Trình chạy Nhiệm vụ ──────────────────────────────────────────────────────────

async function runQuestOne(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkPrompt()); return false; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const valid = manager.filterQuestsValid();
        if (valid.length === 0) { await send(buildNoQuestsCard()); return false; }

        const selMsg = await send(buildQuestSelectCard(valid));

        let selectedId;
        try {
            const interaction = await selMsg.awaitMessageComponent({
                filter: (i) => i.user.id === userId,
                time: 60_000,
                componentType: ComponentType.StringSelect,
            });
            await interaction.deferUpdate();
            selectedId = interaction.values[0];
        } catch {
            const c = new ContainerBuilder().setAccentColor(0xED4245);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⏱️ Hết giờ\nKhông có nhiệm vụ nào được chọn trong 60 giây. Chạy \`${PREFIX}quest\` lại.`));
            await selMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
            return false;
        }

        await selMsg.edit({ components: [], flags: MessageFlags.IsComponentsV2 });

        const quest = valid.find((q) => q.id === selectedId);
        const progressMsg = await send(buildQuestInfoCard(quest, 'starting'));

        const logs = [];
        const log = (m) => { console.log(m); logs.push(m); };
        const questDone = await manager.doingQuest(quest, log);

        if (!questDone) {
            const failReason = logs.filter(l => l.startsWith('[FAIL]')).slice(-2).join('\n') || logs.slice(-3).join('\n') || 'Không thể hoàn thành tự động.';
            await progressMsg.edit(buildQuestInfoCard(quest, 'failed', 0, failReason));
            return false;
        }

        const claimed = await manager.claimRewards(log).catch(() => 0);
        await progressMsg.edit(buildQuestInfoCard(quest, 'done', claimed));
        return true;

    } catch (err) {
        const msg = err?.message ?? String(err);
        if (msg.includes('401') && tokenStore.has(userId)) {
            tokenStore.remove(userId); disableAutoquest(userId);
            await send(buildExpiredTokenCard()).catch(() => {});
        } else {
            await send(buildErrorCard(err)).catch(() => {});
        }
        return false;
    }
}

async function runQuestAll(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkPrompt()); return false; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const valid = manager.filterQuestsValid();
        if (valid.length === 0) { await send(buildNoQuestsCard()); return false; }

        const progressMsgs = await Promise.all(valid.map((q) => send(buildQuestInfoCard(q, 'starting'))));

        const questLogs = valid.map(() => []);
        const questResults = await Promise.allSettled(
            valid.map((quest, i) => {
                const log = (m) => { console.log(m); questLogs[i].push(m); };
                return manager.doingQuest(quest, log);
            }),
        );

        const completed = valid.filter((_, i) => questResults[i].status === 'fulfilled' && questResults[i].value === true);
        const skipped   = valid.filter((_, i) => questResults[i].status === 'rejected' || (questResults[i].status === 'fulfilled' && questResults[i].value === false));

        await Promise.allSettled(skipped.map((q) => {
            const idx = valid.indexOf(q);
            const failLogs = questLogs[idx].filter(l => l.startsWith('[FAIL]'));
            const reason = questResults[idx].status === 'rejected'
                ? questResults[idx].reason?.message ?? 'Lỗi không xác định'
                : failLogs.slice(-2).join('\n') || questLogs[idx].slice(-3).join('\n') || 'Không thể hoàn thành tự động.';
            return progressMsgs[idx].edit(buildQuestInfoCard(q, 'failed', 0, reason));
        }));

        if (completed.length === 0) {
            const c = new ContainerBuilder().setAccentColor(0xFEE75C);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⚠️ Không có Nhiệm vụ Tự động Hoàn thành\nTất cả nhiệm vụ yêu cầu hoàn thành thủ công qua ứng dụng Discord trên máy tính hoặc điện thoại.`));
            await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
            return false;
        }

        const claimed = await manager.claimRewards(console.log).catch(() => 0);
        const claimedPer = completed.length > 0 ? Math.floor(claimed / completed.length) : 0;

        await Promise.allSettled(completed.map((q, i) => {
            const idx = valid.indexOf(q);
            return progressMsgs[idx].edit(buildQuestInfoCard(q, 'done', i === 0 ? claimed : claimedPer));
        }));
        return true;

    } catch (err) {
        const msg = err?.message ?? String(err);
        if (msg.includes('401') && tokenStore.has(userId)) {
            tokenStore.remove(userId); disableAutoquest(userId);
            await send(buildExpiredTokenCard()).catch(() => {});
        } else {
            await send(buildErrorCard(err)).catch(() => {});
        }
        return false;
    }
}

async function runQuestList(userId, tokenStore, send) {
    const token = tokenStore.get(userId);
    if (!token) { await send(buildLinkPrompt()); return; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const all = manager.list();
        if (all.length === 0) { await send(buildNoQuestsCard()); return; }

        const TASK_META = {
            PLAY_ON_DESKTOP:       { icon: '🖥️', label: 'Chơi trên Máy tính' },
            WATCH_VIDEO:           { icon: '🎬', label: 'Xem Video' },
            STREAM_ON_DESKTOP:     { icon: '📺', label: 'Phát trực tiếp trên Máy tính' },
            PLAY_ACTIVITY:         { icon: '🎮', label: 'Chơi Hoạt động' },
            WATCH_VIDEO_ON_MOBILE: { icon: '📱', label: 'Xem Video trên Điện thoại' },
        };

        for (const q of all.slice(0, 10)) {
            const cfg = q.config;
            const msgs = cfg.messages;
            const appId = cfg.application.id;
            const thumbUrl = `https://cdn.discordapp.com/app-assets/${appId}/quest-assets/${cfg.assets.game_tile}.png`;
            const expiresEpoch = Math.floor(new Date(cfg.expires_at).getTime() / 1000);
            const daysLeft = Math.max(0, Math.ceil((new Date(cfg.expires_at).getTime() - Date.now()) / 86400000));

            const st = q.isCompleted() ? { color: 0x57F287, icon: '✅', label: 'Đã hoàn thành' }
                : q.isExpired()        ? { color: 0xED4245, icon: '🔴', label: 'Đã hết hạn' }
                : q.isEnrolledQuest()  ? { color: 0xFEE75C, icon: '⏳', label: 'Đang tiến hành' }
                :                        { color: 0x5865F2, icon: '🔵', label: 'Có sẵn' };

            const taskLines = Object.entries((cfg.task_config ?? cfg.task_config_v2)?.tasks ?? {}).map(([type, task]) => {
                const meta = TASK_META[type] ?? { icon: '⚙️', label: type };
                let dur = '';
                if (type === 'PLAY_ON_DESKTOP' || type === 'STREAM_ON_DESKTOP') dur = `  •  **${Math.ceil(task.target / 60)} phút**`;
                else if (type === 'WATCH_VIDEO' || type === 'WATCH_VIDEO_ON_MOBILE') {
                    const s = task.target;
                    dur = s >= 60 ? `  •  **${Math.ceil(s / 60)} phút**` : `  •  **${s} giây**`;
                }
                return `${meta.icon} ${meta.label}${dur}`;
            });

            const rewardLines = cfg.rewards_config.rewards.map((r) => {
                let line = `**${r.messages.name}**`;
                if (r.orb_quantity) line += `  ✦ *(${r.orb_quantity} Orb)*`;
                else if (r.quantity) line += `  *(${r.quantity} ngày Nitro)*`;
                return line;
            });

            const c = new ContainerBuilder().setAccentColor(st.color);
            c.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# ${st.icon}  ${msgs.quest_name}\n*${msgs.game_title}*  •  ${msgs.game_publisher}`,
                        ),
                    )
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl)),
            );
            c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
            c.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `📊 **Trạng thái:** ${st.label}   📅 **Hết hạn:** <t:${expiresEpoch}:R> *(${daysLeft} ngày)*\n\n` +
                    `📋 **Nhiệm vụ**\n${taskLines.join('\n') || '*Không xác định*'}\n\n` +
                    `🎁 **Phần thưởng**\n${rewardLines.join('\n') || '*Không có phần thưởng*'}`,
                ),
            );
            await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

        if (all.length > 10) {
            const c = new ContainerBuilder().setAccentColor(0x4F545C);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# …và **${all.length - 10}** nhiệm vụ khác không hiển thị.`));
            await send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }

    } catch (err) {
        await send(buildErrorCard(err)).catch(() => {});
    }
}

async function runTokenCheck(userId, tokenStore, replyFn) {
    const token = tokenStore.get(userId);

    if (!token) {
        const c = new ContainerBuilder().setAccentColor(0xFEE75C);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Không có Token Đã lưu\nBạn chưa lưu token. Sử dụng \`${PREFIX}link\` để lưu một token.`));
        await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    let valid = false, accountName = '';
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
        valid = res.ok;
        if (res.ok) {
            const data = await res.json();
            accountName = data.global_name || data.username || '';
        }
    } catch { valid = false; }

    const c = new ContainerBuilder().setAccentColor(valid ? 0x57F287 : 0xED4245);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            valid
                ? `# ✅ Token Hợp lệ\nĐã liên kết với **"${accountName}"**.\n\nToken đã lưu của bạn đang hoạt động chính xác.`
                : `# ❌ Token Không hợp lệ hoặc Hết hạn\nToken đã lưu của bạn bị Discord từ chối.\nSử dụng \`${PREFIX}unlink\` sau đó \`${PREFIX}link\` để lưu token mới.`,
        ),
    );
    await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
    if (!valid) tokenStore.remove(userId);
}

async function runAutoquestToggle(userId, tokenStore, replyFn) {
    if (isAutoquestEnabled(userId)) {
        disableAutoquest(userId);
        const c = new ContainerBuilder().setAccentColor(0xFEE75C);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🤖 Tự động Nhiệm vụ Đã tắt\nTôi sẽ không tự động chạy các nhiệm vụ mới cho bạn.\nSử dụng \`${PREFIX}autoquest\` lại để bật lại.`));
        await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }
    if (!tokenStore.has(userId)) {
        const c = new ContainerBuilder().setAccentColor(0xED4245);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Không có Token Đã lưu\nTự động Nhiệm vụ cần token người dùng Discord của bạn.\n\n**Sử dụng \`${PREFIX}link\` trước**, sau đó chạy \`${PREFIX}autoquest\` lại.`));
        await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }
    enableAutoquest(userId);
    const c = new ContainerBuilder().setAccentColor(0x57F287);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# 🤖 Tự động Nhiệm vụ Đã bật!\nMỗi nhiệm vụ Discord mới sẽ được **tự động hoàn thành** cho bạn ở nền.\n\nTôi sẽ nhắn tin DM cho bạn tóm tắt sau khi mỗi nhiệm vụ kết thúc.\n\nSử dụng \`${PREFIX}autoquest\` lại để tắt tính năng này.\n\n-# Giữ token đã lưu của bạn tươi mới với \`${PREFIX}tokencheck\`.`,
        ),
    );
    await replyFn({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

// ── Xuất Slash + Prefix ─────────────────────────────────────────────────

export const questCmd = {
    data: new SlashCommandBuilder().setName('quest').setDescription('Chọn và hoàn thành một nhiệm vụ Discord'),
    prefix: 'quest',
    async execute(interaction, client) {
        const ts = client.tokenStore;
        await interaction.deferReply();
        await runQuestOne(interaction.user.id, ts, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestOne(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const questAllCmd = {
    data: new SlashCommandBuilder().setName('questall').setDescription('Hoàn thành tất cả nhiệm vụ cùng lúc'),
    prefix: 'questall',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestAll(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestAll(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const questListCmd = {
    data: new SlashCommandBuilder().setName('questlist').setDescription('Liệt kê tất cả nhiệm vụ Discord và trạng thái của chúng'),
    prefix: 'questlist',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestList(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestList(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const tokenCheckCmd = {
    data: new SlashCommandBuilder().setName('tokencheck').setDescription('Kiểm tra token Discord đã lưu còn hợp lệ không'),
    prefix: 'tokencheck',
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        await runTokenCheck(interaction.user.id, client.tokenStore, (opts) => interaction.editReply(opts));
    },
    async prefixExecute(message, _args, client) {
        await runTokenCheck(message.author.id, client.tokenStore, (opts) => message.reply(opts));
    },
};

export const autoquestCmd = {
    data: new SlashCommandBuilder().setName('autoquest').setDescription('Tự động hoàn thành mọi nhiệm vụ mới ngay khi xuất hiện'),
    prefix: 'autoquest',
    async execute(interaction, client) {
        await interaction.deferReply({ flags: 64 });
        await runAutoquestToggle(interaction.user.id, client.tokenStore, (opts) => interaction.editReply(opts));
    },
    async prefixExecute(message, _args, client) {
        await runAutoquestToggle(message.author.id, client.tokenStore, (opts) => message.reply(opts));
    },
};

// ── Liên kết / Hủy liên kết ──────────────────────────────────────────────────────────

export const linkCmd = {
    data: new SlashCommandBuilder().setName('link').setDescription('Lưu token Discord để không bao giờ phải nhập lại'),
    prefix: 'link',

    async execute(interaction, client) {
        await interaction.showModal(buildLinkModal());
    },

    async prefixExecute(message, args, client) {
        const ts = client.tokenStore;
        const inlineToken = args.join('').trim();

        if (inlineToken) {
            try { await message.delete(); } catch {}
            const token = sanitizeToken(inlineToken);

            const sendDM = async (payload) => {
                const user = await client.users.fetch(message.author.id).catch(() => null);
                const dm = await user?.createDM().catch(() => null);
                await dm?.send(payload).catch(() => {});
            };

            if (!isValidUserToken(token)) {
                await sendDM((() => {
                    const c = new ContainerBuilder().setAccentColor(0xED4245);
                    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Định dạng Token Không hợp lệ\nĐó không phải token Discord hợp lệ. Sao chép chính xác giá trị header **Authorization**.`));
                    return { components: [c], flags: MessageFlags.IsComponentsV2 };
                })());
                return;
            }

            let accountName = '', verifyOk = false;
            try {
                const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
                verifyOk = res.ok;
                if (res.ok) {
                    const data = await res.json();
                    accountName = data.global_name || data.username || '';
                }
            } catch {}

            if (!verifyOk) {
                await sendDM((() => {
                    const c = new ContainerBuilder().setAccentColor(0xED4245);
                    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Token Bị Từ chối bởi Discord\nĐảm bảo bạn đã sao chép header \`Authorization\` và thử lại.`));
                    return { components: [c], flags: MessageFlags.IsComponentsV2 };
                })());
                return;
            }

            ts.save(message.author.id, token);
            const c = new ContainerBuilder().setAccentColor(0x57F287);
            c.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# ✅ Token Đã Liên kết!\nĐã liên kết với **"${accountName}"**.\n\nBạn có thể sử dụng \`${PREFIX}quest\`, \`${PREFIX}questall\`, và \`${PREFIX}questlist\`.\nĐể xóa nó, sử dụng \`${PREFIX}unlink\`.`,
                ),
            );
            await sendDM({ components: [c], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        await message.reply(buildLinkPrompt());
    },
};

export const unlinkCmd = {
    data: new SlashCommandBuilder().setName('unlink').setDescription('Xóa token Discord đã lưu'),
    prefix: 'unlink',

    async execute(interaction, client) {
        const ts = client.tokenStore;
        const removed = ts.remove(interaction.user.id);
        disableAutoquest(interaction.user.id);
        const c = new ContainerBuilder().setAccentColor(removed ? 0xFEE75C : 0x4F545C);
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                removed
                    ? `# 🔓 Token Đã Hủy Liên kết\nToken đã lưu của bạn đã bị xóa.`
                    : `# Không có Token Đã lưu\nBạn không có token nào được lưu.`,
            ),
        );
        await interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    },

    async prefixExecute(message, _args, client) {
        const ts = client.tokenStore;
        const removed = ts.remove(message.author.id);
        disableAutoquest(message.author.id);
        const c = new ContainerBuilder().setAccentColor(removed ? 0xFEE75C : 0x4F545C);
        c.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                removed
                    ? `# 🔓 Token Đã Hủy Liên kết\nToken đã lưu của bạn đã bị xóa.`
                    : `# Không có Token Đã lưu\nBạn không có token nào được lưu.`,
            ),
        );
        await message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    },
};

// ── Trình xử lý Gửi Modal (được gọi từ interactionCreate) ───────────────────
export async function handleLinkModal(interaction, client) {
    const ts = client.tokenStore;
    const raw = interaction.fields.getTextInputValue('link_token_input');
    const token = sanitizeToken(raw);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!isValidUserToken(token)) {
        const c = new ContainerBuilder().setAccentColor(0xED4245);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Định dạng Token Không hợp lệ\nĐó không phải token Discord hợp lệ. Sao chép chính xác giá trị header **Authorization**.`));
        await interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    let accountName = '', verifyOk = false;
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
        verifyOk = res.ok;
        if (res.ok) {
            const data = await res.json();
            accountName = data.global_name || data.username || '';
        }
    } catch {}

    if (!verifyOk) {
        const c = new ContainerBuilder().setAccentColor(0xED4245);
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Token Bị Từ chối bởi Discord\nĐảm bảo bạn đã sao chép header \`Authorization\` và thử lại.`));
        await interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    ts.save(interaction.user.id, token);
    const c = new ContainerBuilder().setAccentColor(0x57F287);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# ✅ Token Đã Liên kết!\nĐã liên kết với **"${accountName}"**.\n\nBạn có thể sử dụng \`/quest\`, \`/questall\`, và \`/questlist\`.\nĐể xóa nó, sử dụng \`/unlink\`.`,
        ),
    );
    await interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
}

// ── Trình xử lý Nút: link_prompt (được gọi từ interactionCreate) ────────────
export async function handleLinkPromptButton(interaction) {
    await interaction.showModal(buildLinkModal());
}

// ── Trình chạy Tự động Nhiệm vụ (được gọi từ questWatcher) ────────────────────────────
export async function runAutoquestForUser(userId, quest, tokenStore, discordClient) {
    const token = tokenStore.get(userId);
    if (!token) { disableAutoquest(userId); return; }

    const { QuestClient: QC } = await import('../quest/questClient.js');
    const { Quest: Q } = await import('../quest/quest.js');
    const qc = new QC(token);
    const logs = [];
    const log = (m) => { console.log(`[AutoQuest:${userId}]`, m); logs.push(m); };

    try {
        const manager = await qc.fetchQuests();
        let live = manager.get(quest.id);
        if (!live) {
            live = Q.create({ id: quest.id, config: quest.config, user_status: null, targeted_content: quest.targetedContent, preview: quest.preview });
        }
        if (live.isCompleted() || live.isExpired()) return;

        await manager.doingQuest(live, log);

        let claimManager = manager;
        try { claimManager = await qc.fetchQuests(); } catch { if (!manager.hasQuest(live.id)) manager.upsert(live); }

        const claimed = await claimManager.claimRewards(log).catch(() => 0);

        try {
            const user = await discordClient.users.fetch(userId);
            const dm = await user.createDM();
            const c = new ContainerBuilder().setAccentColor(0x57F287);
            c.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `# 🤖 Tự động Nhiệm vụ Hoàn thành!\n**${live.config.messages.quest_name}** đã được hoàn thành tự động.\n${claimed > 0 ? `🎁 Đã nhận **${claimed}** phần thưởng.\n` : ''}\nSử dụng \`${PREFIX}autoquest\` để tắt.`,
                ),
            );
            await dm.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
        } catch {}

    } catch (err) {
        const msg = err?.message ?? String(err);
        console.error(`[AutoQuest:${userId}] Lỗi:`, msg);
        if (msg.includes('401')) {
            tokenStore.remove(userId);
            disableAutoquest(userId);
            try {
                const user = await discordClient.users.fetch(userId);
                const dm = await user.createDM();
                const c = new ContainerBuilder().setAccentColor(0xED4245);
                c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🤖 Tự động Nhiệm vụ Tạm dừng\nToken đã lưu của bạn đã hết hạn. Chạy \`${PREFIX}link\` để liên kết lại, sau đó \`${PREFIX}autoquest\` để bật lại.`));
                await dm.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
            } catch {}
        }
    }
}
