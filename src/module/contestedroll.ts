import { log } from "../combatdetails";
import { CombatDetails } from "./combatdetailsimpl";
import { getCanvas, MODULE_NAME } from "./settings";

export class ContestedRollApp extends Application {

    token:Token;
    countertoken:Token;

    constructor(options) {
        super(options);
        this.token = getCanvas().tokens.controlled[0];
        this.countertoken = game.user.targets.values()?.next()?.value;
    }

    static get defaultOptions() {
        //@ts-ignore
        return mergeObject(super.defaultOptions, {
            id: "contestedroll",
            title: "Contested Roll",
            template: `/modules/${MODULE_NAME}/templates/contestedroll.html`,
            width: 400,
            height: 250,
            popOut: true
        });
    }

    getData(options) {
        return {
            token: this.token,
            countertoken: this.countertoken,
            abilities: CombatDetails.abilities,
            skills: CombatDetails.skills,
            saves: CombatDetails.saves
        };
    }

    addToken(e) {
        if (getCanvas().tokens.controlled.length > 0) {
            let item = $(e.currentTarget).attr('data-type');
            this[item] = getCanvas().tokens.controlled[0];
            this.render(true);
        }
    }

    removeToken(e) {
        let item = $(e.currentTarget).attr('data-type');
        this[item] = null;
        this.render(true);
    }

    async request() {
        if (this.token != undefined && this.countertoken != undefined) {
            let addActor = function (token, type) {
                let attrtype = $('.contested-roll[data-type="' + type + '"] option:selected', this.element).attr('attr');
                let attr = $('.contested-roll[data-type="' + type + '"]', this.element).val();
                let attrname = $('.contested-roll[data-type="' + type + '"] option:selected', this.element).html() + " " + (attrtype == 'ability' ? "Ability Check" : (attrtype == 'saving' ? "Saving Throw" : "Check"));
                return {
                    id: token.actor.id,
                    tokenid: token.id,
                    attrtype: attrtype,
                    attr: attr,
                    attrname: attrname,
                    icon: token.data.img,
                    name: token.name,
                    passed: 'waiting'
                };
            }

            let mode = $('#contestedroll-rollmode', this.element).val();
            let modename = (mode == 'roll' ? 'Public Roll' : (mode == 'gmroll' ? 'Private GM Roll' : (mode == 'blindroll' ? 'Blind GM Roll' : 'Self Roll')));
            let requestdata = {
                mode: mode,
                modename: modename,
                actors: [addActor.call(this, this.token, 'token'), addActor.call(this, this.countertoken, 'countertoken')]
            };
            const html = await renderTemplate(`/modules/${MODULE_NAME}/templates/contestedrollchatmsg.html`, requestdata);

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
                let token = this.token;
                if (token.actor != undefined) {
                    for (var key in token.actor.data.permission) {
                        if (key != 'default' && token.actor.data.permission[key] >= CONST.ENTITY_PERMISSIONS.OWNER) {
                            if (chatData.whisper.find(t => t == key) == undefined)
                                chatData.whisper.push(key);
                        }
                    }
                }
                token = this.countertoken;
                if (token.actor != undefined) {
                    for (var key in token.actor.data.permission) {
                        if (key != 'default' && token.actor.data.permission[key] >= CONST.ENTITY_PERMISSIONS.OWNER) {
                            if (chatData.whisper.find(t => t == key) == undefined)
                                chatData.whisper.push(key);
                        }
                    }
                }
            }
            //chatData.flags["combatdetails"] = {"testmsg":"testing"};
            setProperty(chatData, "flags."+MODULE_NAME, requestdata);
            ChatMessage.create(chatData, {});
            this.close();
        } else
            ui.notifications.warn("Cannot send request if either actor is missing");
    }

    activateListeners(html) {
        super.activateListeners(html);

        $('.item-add', html).click($.proxy(this.addToken, this));
        $('.item-delete', html).click($.proxy(this.removeToken, this));

        $('.dialog-buttons.request', html).click($.proxy(this.request, this));
    };
}

export class ContestedRoll {
    static async onRollAbility(actorid, message, fastForward = false, e) {
        let actor:Actor = game.actors.get(actorid);

        if (actor != undefined) {
            let actors = message.getFlag(MODULE_NAME, 'actors');
            let msgactor = actors.find(a => { return a.id == actorid; });
            if (msgactor != undefined && msgactor.roll == undefined) {
                let attribute = msgactor.attr;
                let attrtype = msgactor.attrtype;

                let roll = null;
                if (attrtype == 'ability'){
                  //@ts-ignore
                  roll = await actor.rollAbilityTest(attribute, { fastForward: fastForward, chatMessage: false });
                }else if (attrtype == 'saving'){
                  //@ts-ignore
                  roll = await actor.rollAbilitySave(attribute, { fastForward: fastForward, chatMessage: false });
                }else if (attrtype == 'skill'){
                  //@ts-ignore
                  roll = await actor.rollSkill(attribute, { fastForward: fastForward, chatMessage: false });
                }
                if (roll != undefined) {
                    let mode = message.getFlag(MODULE_NAME, 'mode');

                    if (!game.user.isGM) {
                        game.socket.emit(
                            CombatDetails.SOCKET,
                            {
                                msgtype: 'rollability',
                                type: 'contestedroll',
                                senderId: game.user._id,
                                actorid: actorid,
                                msgid: message.id,
                                roll: roll
                            },
                            (resp) => { }
                        );
                    } else {
                        const revealDice = game.dice3d ? game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") : false;
                        await ContestedRoll.updateContestedRoll(actorid, message, roll, !revealDice && !fastForward);
                    }

                    log('rolling ability', msgactor, roll);

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
                              ContestedRoll.finishRolling(actorid, message);
                          }
                        });
                    }
                }

                log("Roll", roll, actor);
            }
        }
        return message;
    }

    static async finishRolling(actorid, message) {
        if (!game.user.isGM) {
            game.socket.emit(
                CombatDetails.SOCKET,
                {
                    msgtype: 'finishroll',
                    type: 'contestedroll',
                    senderId: game.user._id,
                    actorid: actorid,
                    msgid: message.id
                }
            );
        } else {
            let actors = duplicate(message.getFlag(MODULE_NAME, 'actors'));
            let msgactor = actors.find(a => { return a.id == actorid; });
            log('finishing roll', msgactor);
            msgactor.rolling = false;
            message.setFlag(MODULE_NAME, 'actors', actors);
        }
    }

    static async updateContestedRoll(actorid, message, roll, rolling = false) {
        let actors = duplicate(message.getFlag(MODULE_NAME, 'actors'));
        let msgactor = actors.find(a => { return a.id == actorid; });
        log('updating contested roll', msgactor, roll);

        msgactor.roll = roll.toJSON();
        msgactor.rolling = msgactor.rolling || rolling;//!fastForward;
        msgactor.total = roll.total;

        let tooltip = await roll.getTooltip();

        ContestedRoll.checkResult(actors);

        let content = $(message.data.content);
        $(tooltip).insertAfter($('.item[data-item-id="' + actorid + '"] .item-row', content));
        $('.item[data-item-id="' + actorid + '"] .item-row .item-roll', content).remove();
        $('.item[data-item-id="' + actorid + '"] .item-row .roll-controls', content).append(
            `<div class="dice-total flexrow" style="display:none;">
                <div class= "dice-result">${msgactor.total}</div >
                <a class="item-control roll-result" title="Roll Result" data-control="rollResult">
                    <i class="fas"></i>
                </a>
            </div >`);

        message.update({ content: content[0].outerHTML });
        await message.setFlag(MODULE_NAME, 'actors', actors);
    }

    static async checkResult(actors) {
        if (actors[0].roll != undefined && actors[1].roll != undefined) {
            actors[0].passed = (actors[0].roll.total > actors[1].roll.total ? 'won' : (actors[0].roll.total < actors[1].roll.total ? 'failed' : 'tied'));
            actors[1].passed = (actors[0].roll.total < actors[1].roll.total ? 'won' : (actors[0].roll.total > actors[1].roll.total ? 'failed' : 'tied'));
        } else {
            actors[0].passed = 'waiting';
            actors[1].passed = 'waiting';
        }
    }

    static async onRollAll(message) {
        if (game.user.isGM) {
            let actors = message.getFlag(MODULE_NAME, 'actors');
            for (let i = 0; i < actors.length; i++) {
                let msgactor = actors[i];
                if (msgactor.roll == undefined) {
                    let actor = game.actors.get(msgactor.id);
                    if (actor != undefined) {
                        //roll the dice, using standard details from actor
                        await ContestedRoll.onRollAbility(msgactor.id, message, true, undefined);
                    }
                }
            };
        }
    }

    static async setRollSuccess(actorid, message, success) {
        let actors = duplicate(message.getFlag(MODULE_NAME, 'actors'));
        actors[0].passed = actors[1].passed = 'failed';
        let msgactor = actors.find(a => { return a.id == actorid; });
        msgactor.passed = 'won';

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
