import { log } from "../combatdetails";
import { CombatDetails } from "./combatdetailsimpl";
import { getCanvas, MODULE_NAME } from "./settings";


export class AssignXPApp extends Application {

    xp:number;
    actors:any[];

    constructor(combat, options) {
        super(options);

        var that = this;

        this.xp = 0;
        if (combat != undefined) {
            this.actors = [];
            $(combat.combatants).each(function () {
                if (this.token?.disposition != 1) {
                  that.xp += this.actor?.data.data.details.xp.value;
                } else if (this.actor){
                  that.actors.push({
                      actor: this.actor,
                      disabled: false,
                      xp: 0
                  });
                }
            });
        } else {
            this.actors = getCanvas().tokens.placeables.filter(t => {
                return t.actor?.hasPlayerOwner && t.actor?.data.type == 'character'
            }).map(t => {
                return {
                    actor: t.actor,
                    disabled: false,
                    xp: 0
                };
            });
        }

        this.changeXP(undefined);
    }

    static get defaultOptions() {
        //@ts-ignore
        return mergeObject(super.defaultOptions, {
            id: "assignexperience",
            title: "Assign XP",
            template: `/modules/${MODULE_NAME}/templates/assignxp.html`,
            width: 400,
            height: 400,
            popOut: true
        });
    }

    getData(options) {
        return {
            actors: this.actors,
            xp:this.xp
        };
    }

    changeXP(xp) {
        if(xp != undefined){
            this.xp = xp;
        }

        let charxp = parseInt(String(this.xp / this.actors.filter(a => { return !a.disabled; }).length));

        $(this.actors).each(function(){
            this.xp = (this.disabled ? 0 : charxp);
        });
    }

    addActor() {
        //drag drop?
        this.changeXP(undefined);
        this.render(true);
    }

    disableActor(id) {
        let actor = this.actors.find(a => { return a.actor.id === id; });
        if (actor != undefined){
            actor.disabled = !actor.disabled;
        }
        this.changeXP(undefined);
        this.render(true);
    }

    async assign() {
        let chatactors = this.actors
            .filter(a => { return !a.disabled; })
            .map(a => {
                return {
                    id: a.actor.id,
                    //actor: a.actor,
                    icon: a.actor.data.img,
                    name: a.actor.data.name,
                    xp: a.xp,
                    assigned: false
                }
            });

        if (chatactors.length > 0) {
            let requestdata = {
                xp: this.xp,
                actors: chatactors
            };
            const html = await renderTemplate(`/modules/${MODULE_NAME}/templates/assignxpchatmsg.html`, requestdata);

            log('create chat request');
            let chatData = {
                user: game.user._id,
                content: html
            };

            setProperty(chatData, "flags."+MODULE_NAME, requestdata);
            ChatMessage.create(chatData, {});
            this.close();
        } else
            ui.notifications.warn("Cannot send request if no actors selected");
    }

    activateListeners(html) {
        super.activateListeners(html);
        var that = this;

        //$('.item-create', html).click($.proxy(this.addToken, this));

        $('.item-list .item', html).each(function (elem) {
            $('.item-delete', this).click($.proxy(that.disableActor, that, this.dataset.itemId));
        });

        $('.dialog-buttons.assign', html).click($.proxy(this.assign, this));

        $('#assign-xp-value', html).blur(function () {
            let xp = parseInt(String($(this).val()));
            that.changeXP.call(that, xp);
            that.render(true);
        });
    };
}

export class AssignXP {
    static async onAssignXP(actorid, message, e) {
        if (game.user.isGM) {
            let actors = JSON.parse(JSON.stringify(message.getFlag(MODULE_NAME, 'actors')));
            let msgactor = actors.find(a => { return a.id == actorid; });

            if (!msgactor.assigned) {
                let actor = game.actors.get(actorid);
                await actor.update({
                    "data.details.xp.value": actor.data.data.details.xp.value + msgactor.xp
                });

                msgactor.assigned = true;
            }
            await message.setFlag(MODULE_NAME, 'actors', actors);
        } else {
            $(e.target).hide();
            game.socket.emit(
                CombatDetails.SOCKET,
                {
                    msgtype: 'assignxp',
                    senderId: game.user._id,
                    actorid: actorid,
                    msgid: message.id
                },
                (resp) => { }
            );
        }
    }

    static async onAssignAllXP(message) {
        if (game.user.isGM) {
            let actors = message.getFlag(MODULE_NAME, 'actors');
            for (let i = 0; i < actors.length; i++) {
                let msgactor = actors[i];
                if (!msgactor.assigned) {
                    await AssignXP.onAssignXP(msgactor.id, message, undefined);
                }
            };
        }
    }
}
