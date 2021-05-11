import { log } from "../combatdetails";
import { CombatDetails } from "./combatdetailsimpl";
import { getCanvas, MODULE_NAME } from "./settings";

export class SavingThrowApp extends Application {

    tokens:any[];

    constructor(options) {
        super(options);
        this.tokens = getCanvas().tokens.controlled.filter(t => t.actor != undefined);
    }

    static get defaultOptions() {
        //@ts-ignore
        return mergeObject(super.defaultOptions, {
            id: "requestsavingthrow",
            title: "Request Roll",
            template: `/modules/${MODULE_NAME}/templates/savingthrow.html`,
            width: 400,
            height: 400,
            popOut: true
        });
    }

    getData(options) {
        return {
            tokens: this.tokens,
            abilities: CombatDetails.abilities,
            skills: CombatDetails.skills,
            saves: CombatDetails.saves
        };
    }

    addToken() {
        getCanvas().tokens.controlled.forEach(token => {
            if (this.tokens.find(t => t.id === token.id) == undefined) {
                if (token.actor == undefined)
                    ui.notifications.warn('token has no actor to use for additional attributes');
                else
                    this.tokens.push(token);
            }
        });
        this.render(true);
    }

    removeToken(id) {
        let idx = this.tokens.findIndex(t => t.id === id);
        if (idx > -1) {
            this.tokens.splice(idx, 1);
        }
        this.render(true);
    }

    async request() {
        if (this.tokens.length > 0) {
            let actors = this.tokens.map(t => {
                return {
                    id: t.actor.id,
                    tokenid: t.id,
                    icon: t.data.img,
                    name: t.name
                };
            });
            let rolltype = $('#combatdetail-roll option:selected', this.element).attr('attr');
            let mode = $('#combatdetail-rollmode', this.element).val();
            let modename = (mode == 'roll' ? 'Public Roll' : (mode == 'gmroll' ? 'Private GM Roll' : (mode == 'blindroll' ? 'Blind GM Roll' : 'Self Roll')));
            let requestdata = {
                dc: $('#combatdetail-savingdc', this.element).val(),
                name: $('#combatdetail-roll option:selected', this.element).html() + " " + (rolltype == 'ability' ? "Ability Check" : (rolltype == 'saving' ? "Saving Throw" : "Check")),
                rolltype: rolltype,
                roll: $('#combatdetail-roll', this.element).val(),
                mode: mode,
                modename: modename,
                actors: actors
            };
            const html = await renderTemplate(`/modules/${MODULE_NAME}/templates/svgthrowchatmsg.html`, requestdata);

            log('create chat request');
            let chatData = {
                user: game.user._id,
                content: html,
                whisper: []
            };
            if (requestdata.mode == 'selfroll')
                chatData.whisper = [game.user._id];
            else if (requestdata.mode == 'blindroll') {
                chatData.whisper = [game.user._id];
                for (let i = 0; i < this.tokens.length; i++) {
                    let token = this.tokens[i];
                    if (token.actor != undefined) {
                        for (var key in token.actor.data.permission) {
                            if (key != 'default' && token.actor.data.permission[key] >= CONST.ENTITY_PERMISSIONS.OWNER) {
                                if (chatData.whisper.find(t => t == key) == undefined)
                                    chatData.whisper.push(key);
                            }
                        }
                    }
                }
            }
            //chatData.flags["combatdetails"] = {"testmsg":"testing"};
            setProperty(chatData, "flags."+MODULE_NAME, requestdata);
            ChatMessage.create(chatData, {});
            this.close();
        } else
            ui.notifications.warn("Cannot send request if no tokens selected");
    }

    activateListeners(html) {
        super.activateListeners(html);
        var that = this;

        $('.item-create', html).click($.proxy(this.addToken, this));

        $('.item-list .item', html).each(function (elem) {
            $('.item-delete', this).click($.proxy(that.removeToken, that, this.dataset.itemId));
        });

        $('.dialog-buttons.request', html).click($.proxy(this.request, this));
    };
}

export class SavingThrow {
    static async onRollAbility(actorid, message, fastForward = false, e) {
        let actor = game.actors.get(actorid);

        if (actor != undefined) {
            let requestroll = message.getFlag(MODULE_NAME, 'roll');
            let rolltype = message.getFlag(MODULE_NAME, 'rolltype');

            let roll = null;
            if (rolltype == 'ability'){
              //@ts-ignore
              roll = await actor.rollAbilityTest(requestroll, { fastForward: fastForward, chatMessage: false });
            }else if (rolltype == 'saving'){
              //@ts-ignore
              roll = await actor.rollAbilitySave(requestroll, { fastForward: fastForward, chatMessage: false });
            }else if (rolltype == 'skill'){
              //@ts-ignore
              roll = await actor.rollSkill(requestroll, { fastForward: fastForward, chatMessage: false });
            }
            if (roll != undefined) {
                let mode = message.getFlag(MODULE_NAME, 'mode');

                if (!game.user.isGM) {
                    game.socket.emit(
                        CombatDetails.SOCKET,
                        {
                            msgtype: 'rollability',
                            type: 'savingthrow',
                            senderId: game.user._id,
                            actorid: actorid,
                            msgid: message.id,
                            roll: roll
                        },
                        (resp) => { }
                    );
                } else {
                    const revealDice = game.dice3d ? game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") : false;
                    await SavingThrow.updateSavingRoll(actorid, message, roll, !revealDice);
                }

                if (game.dice3d != undefined && !fastForward) {
                    let whisper = (mode == 'roll' ? null : ChatMessage.getWhisperRecipients("GM").map(w => { return w.id }));
                    if (mode == 'gmroll' && !game.user.isGM){
                        whisper.push(game.user._id);
                    }
                    const sound = CombatDetails.getDiceSound();
                    if (sound != undefined){
                        AudioHelper.play({ src: sound, volume: 0.8, autoplay: false, loop: false }, true);
                    }
                    //@ts-ignore
                    game.dice3d.showForRoll(roll, game.user, true, whisper, (mode == 'blindroll' && !game.user.isGM)).then(() => {
                        const revealDice = game.dice3d ? game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") : false;
                        if (!revealDice){
                          SavingThrow.finishRolling(actorid, message);
                        }
                    });
                }
            }

            log("Roll", roll, actor);
        }
        return message;
    }

    static async finishRolling(actorid, message) {
        if (!game.user.isGM) {
            game.socket.emit(
                CombatDetails.SOCKET,
                {
                    msgtype: 'finishroll',
                    type: 'savingthrow',
                    senderId: game.user._id,
                    actorid: actorid,
                    msgid: message.id
                }
            );
        } else {
            let actors = JSON.parse(JSON.stringify(message.getFlag(MODULE_NAME, 'actors')));
            let msgactor = actors.find(a => { return a.id == actorid; });
            msgactor.rolling = false;
            message.setFlag(MODULE_NAME, 'actors', actors);
        }
    }

    static async updateSavingRoll(actorid, message, roll, rolling = false) {
        let dc = message.getFlag(MODULE_NAME, 'dc');

        let actors = JSON.parse(JSON.stringify(message.getFlag(MODULE_NAME, 'actors')));
        let msgactor = actors.find(a => { return a.id == actorid; });
        log('updating actor', msgactor, roll);

        msgactor.roll = roll.toJSON();
        msgactor.rolling = rolling;//!fastForward;
        msgactor.total = roll.total;

        let tooltip = await roll.getTooltip();

        if (dc != '')
            msgactor.passed = (msgactor.total >= dc);

        let content = $(message.data.content);
        $(tooltip).insertAfter($('.item[data-item-id="' + actorid + '"] .item-row', content));
        $('.item[data-item-id="' + actorid + '"] .item-row .item-roll', content).remove();
        $('.item[data-item-id="' + actorid + '"] .item-row .roll-controls', content).append(
            `<div class="dice-total flexrow" style="display:none;">
                <div class= "dice-result">${msgactor.total}</div >
                <a class="item-control result-passed gm-only" title="Roll Passed" data-control="rollPassed">
                    <i class="fas fa-check"></i>
                </a>
                <a class="item-control result-failed gm-only" title="Roll Failed" data-control="rollFailed">
                    <i class="fas fa-times"></i>
                </a>
                <div class="dice-text player-only"></div>
            </div >`);

        message.update({ content: content[0].outerHTML });
        await message.setFlag(MODULE_NAME, 'actors', actors);
    }

    static async onRollAll(mode, message) {
        if (game.user.isGM) {
            let actors = message.getFlag(MODULE_NAME, 'actors');
            for (let i = 0; i < actors.length; i++) {
                let msgactor = actors[i];
                if (msgactor.roll == undefined) {
                    let actor = game.actors.get(msgactor.id);
                    if (actor != undefined && (mode == 'all' || actor.data.type != 'character')) {
                        //roll the dice, using standard details from actor
                        await SavingThrow.onRollAbility(msgactor.id, message, true, undefined);
                    }
                }
            };

            //when they're all finished calculate Group DC
            log('Calc GroupDC', message);
        }
    }

    static async setRollSuccess(actorid, message, success) {
        let actors = JSON.parse(JSON.stringify(message.getFlag(MODULE_NAME, 'actors')));
        let msgactor = actors.find(a => { return a.id == actorid; });

        if (msgactor.passed === success)
            delete msgactor.passed;
        else
            msgactor.passed = success;

        await message.setFlag(MODULE_NAME, 'actors', actors);
    }

    static async _onClickToken(tokenId, event) {
        if (event.stopPropagation) event.stopPropagation();
        if (event.preventDefault) event.preventDefault();
        event.cancelBubble = true;
        event.returnValue = false;

        let token = getCanvas().tokens.get(tokenId);
        token.control({ releaseOthers: true });
        return getCanvas().animatePan({ x: token.x, y: token.y });
    }
}
