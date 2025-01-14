﻿import { getCanvas, MODULE_NAME, registerSettings } from "./settings.js";
import { TokenBar } from "./tokenbar.js";
import { MMCQ } from "../libs/quantize.js";
import { AssignXP, AssignXPApp } from "./assignxp.js";
import { SavingThrow } from "./savingthrow.js";
import { ContestedRoll } from "./contestedroll.js";
import { i18n, log } from "../combatdetails.js";

export let volume = () => {
  return <number>game.settings.get(MODULE_NAME, "volume") / 100.0;
};
export let combatposition = () => {
  return <string>game.settings.get(MODULE_NAME, "combat-position");
};

/**
 * ============================================================
 * CombatDetails class
 *
 * Encapsulates all CombatDetails functions in a class
 *
 * Copious amount of Statics used
 *
 *
 *
 *
 * ============================================================
 */
export class CombatDetails {

    static SOCKET:string;
    static READY:boolean;
    static xpchart:any[];

    static TURN_SOUND:string;
    static NEXT_SOUND:string;
    static ROUND_SOUND:string;
    static ACK_SOUND:string;

    static abilities:string;
    static skills:string;
    static saves:string;
    static element:any;

    static tokenHUD:any;
    static canvasImage:HTMLImageElement;

    static tracker = false;
    static tokenbar = null;

    static currentScene:Scene;

    static init() {
	    log("initializing");
        // element statics
        CONFIG.debug.hooks = true;

        CombatDetails.SOCKET = "module."+MODULE_NAME;
        //game.socket.on(CombatDetails.SOCKET, CombatDetails.onMessage);

        CombatDetails.READY = true;

        CombatDetails.xpchart = [
            { cr: 0, xp: 10 },
            { cr: 0.13, xp: 25 },
            { cr: 0.25, xp: 50 },
            { cr: 0.5, xp: 100 },
            { cr: 1, xp: 200 },
            { cr: 2, xp: 450 },
            { cr: 3, xp: 700 },
            { cr: 4, xp: 1100 },
            { cr: 5, xp: 1800 },
            { cr: 6, xp: 2300 },
            { cr: 7, xp: 2900 },
            { cr: 8, xp: 3900 },
            { cr: 9, xp: 5000 },
            { cr: 10, xp: 5900 },
            { cr: 11, xp: 7200 },
            { cr: 12, xp: 8400 },
            { cr: 13, xp: 10000 },
            { cr: 14, xp: 11500 },
            { cr: 15, xp: 13000 },
            { cr: 16, xp: 15000 },
            { cr: 17, xp: 18000 },
            { cr: 18, xp: 20000 },
            { cr: 19, xp: 22000 },
            { cr: 20, xp: 25000 },
            { cr: 21, xp: 33000 },
            { cr: 22, xp: 41000 },
            { cr: 23, xp: 50000 },
            { cr: 24, xp: 62000 },
            { cr: 25, xp: 75000 },
            { cr: 26, xp: 90000 },
            { cr: 27, xp: 105000 },
            { cr: 28, xp: 120000 },
            { cr: 29, xp: 135000 },
            { cr: 30, xp: 155000 }
        ];

        // sound statics
        CombatDetails.TURN_SOUND =  `/modules/${MODULE_NAME}/assets/sounds/turn.wav`;
        CombatDetails.NEXT_SOUND =  `/modules/${MODULE_NAME}/assets/sounds/next.wav`;
        CombatDetails.ROUND_SOUND =  `/modules/${MODULE_NAME}/assets/sounds/round.wav`;
        CombatDetails.ACK_SOUND =  `/modules/${MODULE_NAME}/assets/sounds/ack.wav`;

        CONFIG.statusEffects = CONFIG.statusEffects.concat(
            [
                { "id": "charmed", "label": MODULE_NAME+".StatusCharmed", "icon": `/modules/${MODULE_NAME}/assets/icons/smitten.png` },
                { "id": "exhausted", "label": MODULE_NAME+".StatusExhausted", "icon": `/modules/${MODULE_NAME}/assets/icons/oppression.png` },
                { "id": "grappled", "label": MODULE_NAME+".StatusGrappled", "icon": `/modules/${MODULE_NAME}/assets/icons/grab.png` },
                { "id": "incapacitated", "label": MODULE_NAME+".StatusIncapacitated", "icon": `/modules/${MODULE_NAME}/assets/icons/internal-injury.png` },
                { "id": "invisible", "label": MODULE_NAME+".StatusInvisible", "icon": `/modules/${MODULE_NAME}/assets/icons/invisible.png` },
                { "id": "petrified", "label": MODULE_NAME+".StatusPetrified", "icon": `/modules/${MODULE_NAME}/assets/icons/stone-pile.png` },
                { "id": "hasted", "label": MODULE_NAME+".StatusHasted", "icon": `/modules/${MODULE_NAME}/assets/icons/running-shoe.png` },
                { "id": "slowed", "label": MODULE_NAME+".StatusSlowed", "icon": `/modules/${MODULE_NAME}/assets/icons/turtle.png` },
                { "id": "concentration", "label": MODULE_NAME+".StatusConcentrating", "icon": `/modules/${MODULE_NAME}/assets/icons/beams-aura.png` },
                { "id": "rage", "label": MODULE_NAME+".StatusRage", "icon": `/modules/${MODULE_NAME}/assets/icons/enrage.png` },
                { "id": "distracted", "label": MODULE_NAME+".StatusDistracted", "icon": `/modules/${MODULE_NAME}/assets/icons/distraction.png` },
                { "id": "dodging", "label": MODULE_NAME+".StatusDodging", "icon": `/modules/${MODULE_NAME}/assets/icons/dodging.png` },
                { "id": "disengage", "label": MODULE_NAME+".StatusDisengage", "icon": `/modules/${MODULE_NAME}/assets/icons/journey.png` }
            ]
        );

        CONFIG.statusEffects = CONFIG.statusEffects.sort(function (a, b) {
            return (a.id == undefined || a.id > b.id ? 1 : (a.id < b.id ? -1 : 0));
        })

        // registerSettings();

        if (game.settings.get(MODULE_NAME, "alter-hud")){
            let oldTokenHUDRender = TokenHUD.prototype._render;
            TokenHUD.prototype._render = function (force = false, options = {}) {
                let result = oldTokenHUDRender.call(this, force, options).then((a, b) => {
                    log('after render');
                    CombatDetails.alterHUD(CombatDetails.element);
                });

                return result;
            }
        }

        //let oldTokenCanDrag = Token.prototype._canDrag;

    }

    static combatDetailsTokenPrototypeCanDragHandler= async function (wrapped, ...args) {
    // Token.prototype._canDrag = function (user, event) {
          let blockCombat = function (tokenId) {
              //combat movement is only acceptable if the token is the current token.
              //or the previous token
              //let allowPrevMove = game.settings.get(MODULE_NAME, "allow-previous-move");
              let curCombat = game.combats.active;

              if (curCombat && curCombat.started) {
                  let entry = curCombat.combatant;
                  // prev combatant
                  /*
                  let prevturn = (curCombat.turn || 0) - 1;
                  if (prevturn == -1) prevturn = (curCombat.turns.length - 1);
                  let preventry = curCombat.turns[prevturn];

                  //find the next one that hasn't been defeated
                  while (preventry.defeated && preventry != curCombat.turn) {
                      prevturn--;
                      if (prevturn == -1) prevturn = (curCombat.turns.length - 1);
                      preventry = curCombat.turns[prevturn];
                  }*/

                  return !(entry.tokenId == tokenId); // || preventry.tokenId == tokenId);
              }

              return true;
          }

          let movement = this.getFlag(MODULE_NAME, "movement") || game.settings.get(MODULE_NAME, "movement") || "free";

          if (!game.user.isGM) {
              if (movement == "none" ||
                  (movement == "combat" && blockCombat(this.id))) {
                  //prevent the token from moving
                  if (!this.getFlag(MODULE_NAME, "notified") || false) {
                      ui.notifications.warn(movement == "combat" ? "Movement is set to combat turn, it's currently not your turn" : "Movement is currently locked");
                      this.setFlag(MODULE_NAME, "notified", true);
                      setTimeout(function (token) {
                          log('unsetting notified', token);
                          token.unsetFlag(MODULE_NAME, "notified");
                      }, 30000, this);
                  }
                  return false;
              }
          }

          //return oldTokenCanDrag.call(this, user, event);
          return wrapped(args);
      }

    static ready() {
        CombatDetails.checkCombatTurn();

        game.socket.on('module.'+MODULE_NAME, CombatDetails.onMessage);
        if (game.system.id == "pf2e") {
            //@ts-ignore
            CombatDetails.abilities = CONFIG.PF2E.abilities;
            //@ts-ignore
            CombatDetails.skills = CONFIG.PF2E.skills;
            //@ts-ignore
            CombatDetails.saves = CONFIG.PF2E.saves;
        } else if (game.system.id == "D35E") {
            //@ts-ignore
            CombatDetails.abilities = CONFIG.D35E.abilities;
            //@ts-ignore
            CombatDetails.skills = CONFIG.D35E.skills;
            //@ts-ignore
            CombatDetails.saves = CONFIG.D35E.savingThrows;
        } else {
            //@ts-ignore
            CombatDetails.abilities = CONFIG.DND5E.abilities;
            //@ts-ignore
            CombatDetails.skills = CONFIG.DND5E.skills;
            //@ts-ignore
            CombatDetails.saves = CONFIG.DND5E.abilities;
        }

        //$('#board').on('mousedown', CombatDetails._onClickLeft);
        getCanvas().stage.on("mousedown", CombatDetails.moveTokens);
    }

    static async moveTokens(event) {
        if (game.user.isGM && game.keyboard.isDown("m") && getCanvas().tokens.controlled.length > 0) {
            let pos = event.data.getLocalPosition(getCanvas().app.stage);
            let mid = {
                x: getCanvas().tokens.controlled[0].data.x,
                y: getCanvas().tokens.controlled[0].data.y
            };
            for (let i = 1; i < getCanvas().tokens.controlled.length; i++) {
                mid.x += getCanvas().tokens.controlled[i].data.x;
                mid.y += getCanvas().tokens.controlled[i].data.y;
            }
            mid.x = (mid.x / getCanvas().tokens.controlled.length);
            mid.y = (mid.y / getCanvas().tokens.controlled.length);

            let tokens = getCanvas().tokens.controlled.map(t => { return t.id; })
            for (let i = 0; i < tokens.length; i++) {
                let t = getCanvas().tokens.get(tokens[i]);
                let offsetx = mid.x - t.data.x;
                let offsety = mid.y - t.data.y;
                let gridPt = getCanvas().grid.grid.getGridPositionFromPixels(pos.x - offsetx, pos.y - offsety);
                let px = getCanvas().grid.grid.getPixelsFromGridPosition(gridPt[0], gridPt[1]);

                await t.update({ x: px[0], y: px[1] }, { animate: false });
            }
        }
    }

    static onMessage(data) {
        switch (data.msgtype) {
            case 'rollability': {
                let message = game.messages.get(data.msgid);
                const revealDice = game.dice3d ? game.settings.get("dice-so-nice", "immediatelyDisplayChatMessages") : false;
                if(data.type == 'savingthrow')
                    SavingThrow.updateSavingRoll(data.actorid, message, Roll.fromData(data.roll), !revealDice);
                else if (data.type == 'contestedroll')
                    ContestedRoll.updateContestedRoll(data.actorid, message, Roll.fromData(data.roll), !revealDice);
            } break;
            case 'finishroll': {
                let message = game.messages.get(data.msgid);
                if (data.type == 'savingthrow')
                    SavingThrow.finishRolling(data.actorid, message);
                else if (data.type == 'contestedroll')
                    ContestedRoll.finishRolling(data.actorid, message);
            } break;
            case 'assignxp': {
                let message = game.messages.get(data.msgid);
                AssignXP.onAssignXP(data.actorid, message, undefined);
            } break;
            case 'movementchange': {
                if (data.tokenid == undefined || getCanvas().tokens.get(data.tokenid)?.owner) {
                    ui.notifications.warn(data.msg);
                    log('movement change');
                }
            }
        }
    }

    static doDisplayTurn() {
        if (!game.settings.get(MODULE_NAME, "showcurrentup")) {
            return;
        }

        if (!CombatDetails.READY) {
            CombatDetails.init();
        }
        ui.notifications.warn(i18n(MODULE_NAME+".Turn"));

        // play a sound
        if(volume() > 0)
	        AudioHelper.play({ src: CombatDetails.TURN_SOUND, volume: volume(), autoplay: false, loop: false}, true);
    }

    static doDisplayNext() {
        if (!game.settings.get(MODULE_NAME, "shownextup")) {
            return;
        }

        if (!CombatDetails.READY) {
            CombatDetails.init();
        }

        ui.notifications.info(i18n(MODULE_NAME+".Next"));
        // play a sound
        if(volume() > 0)
	        AudioHelper.play({ src: CombatDetails.NEXT_SOUND, volume: volume(), autoplay: false, loop: false}, true);
    }

    /**
    * Check if the current combatant needs to be updated
    */
    static checkCombatTurn() {
        let curCombat = game.combats.active;

        if (curCombat && curCombat.started) {
            let entry = curCombat.combatant;
            // next combatant
            let nxtturn = (curCombat.turn || 0) + 1;
            if (nxtturn > curCombat.turns.length - 1) nxtturn = 0;
            let nxtentry = curCombat.turns[nxtturn];

            //find the next one that hasn't been defeated
            while (nxtentry.defeated && nxtturn != curCombat.turn) {
                nxtturn++;
                if (nxtturn > curCombat.turns.length - 1) nxtturn = 0;
                nxtentry = curCombat.turns[nxtturn];
            }

            if (entry !== undefined) {
                let isActive = entry.actor?._id === game.users.current.character?._id;
                let isNext = nxtentry.actor?._id === game.users.current.character?._id;

                if (isActive) {
                    CombatDetails.doDisplayTurn();
                } else if (isNext) {
                    CombatDetails.doDisplayNext();
                }
            }
        }
    }

    /*
    static async expandHotbar(e) {
        ui.hotbar._pagecollapsed = !ui.hotbar._pagecollapsed;
        $('#hotbar .hotbar-page')
            .toggleClass('collapsed', ui.hotbar._pagecollapsed)
            .toggleClass('opening', !ui.hotbar._pagecollapsed)
            .one("transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd", function () { $(this).removeClass('opening') });
    }

    static changePage(page, e) {
        this.page = page;
        this.render(true);
        ui.hotbar._pagecollapsed = true;
        $('#hotbar .hotbar-page').addClass('collapsed');
    }

    static async clearMacroRow(page, e) {
        for (let i = 1; i <= 10; i++) {
            await game.user.assignHotbarMacro(null, ((page - 1) * 10) + i);
        }
    }*/

    static repositionCombat(app) {
        //we want to start the dialog in a different corner
        let sidebar = document.getElementById("sidebar");
        let players = document.getElementById("players");

        let butHeight = (!game.user.isGM && !app.combat.getCombatantByToken(app.combat.current.tokenId).owner ? 40 : 0);

        app.position.left = (combatposition().endsWith('left') ? 120 : (sidebar.offsetLeft - app.position.width));
        app.position.top = (combatposition().startsWith('top') ?
            (combatposition().endsWith('left') ? 70 : (sidebar.offsetTop - 3)) :
            (combatposition().endsWith('left') ? (players.offsetTop - app.position.height - 3) : (sidebar.offsetTop + sidebar.offsetHeight - app.position.height - 3)) - butHeight);
        $(app._element).css({ top: app.position.top, left: app.position.left });
    }

    static alterHUD(html) {
        $('.col.right .control-icon.effects .status-effects img', html).each(function () {
            let div = $('<div>')
                .addClass('effect-control')
                .toggleClass('active', $(this).hasClass('active'))
                .attr('title', $(this).attr('title'))
                .attr('data-status-id', $(this).attr('data-status-id'))
                .attr('src', $(this).attr('src'))
                .insertAfter(this)
                .append($(this).removeClass('effect-control'))
                .append($('<div>').html($(this).attr('title')).click(function (event) {
                    $(this).prev().click();
                    if (event.stopPropagation) event.stopPropagation();
                    if (event.preventDefault) event.preventDefault();
                    //@ts-ignore
                    event.cancelBubble = true;
                    //@ts-ignore
                    event.returnValue = false;
                    return false;
                }));
            //@ts-ignore
            div[0].src = $(this).attr('src');
        });
        $('.col.right .control-icon.effects .status-effects', html).append(
            $('<div>').addClass('clear-all').html('<i class="fas fa-times-circle"></i> clear all').click($.proxy(CombatDetails.clearAll, this))
        );
    }

    static async clearAll() {
        //find the tokenhud, get the TokenHUD.object  ...assuming it's a token?
        let selectedEffects = $('#token-hud .col.right .control-icon.effects .status-effects .effect-control.active');
        for (let ctrl of selectedEffects) {
            let img = $('img', ctrl).get(0);
            if (img != undefined) {
                const effect = (img.dataset.statusId && CombatDetails.tokenHUD.object.actor) ?
                    CONFIG.statusEffects.find(e => e.id === img.dataset.statusId) :
                    img.getAttribute("src");

                await CombatDetails.tokenHUD.object.toggleEffect(effect);
            }
        };
    }

    static getCRText (cr) {
        switch (cr) {
            case 0.13: return '1/8';
            case 0.17: return '1/6';
            case 0.25: return '1/4';
            case 0.33: return '1/3';
            case 0.5: return '1/2';
            default: return cr;
        }
    }

    static getCRChallenge (data) {
        if (data.cr < data.apl) return 'easy';
        else if (data.cr === data.apl) return 'average';
        else if (data.cr === data.apl + 1) return 'challenging';
        else if (data.cr === data.apl + 2) return 'hard';
        else if (data.cr >= data.apl + 3) return 'epic';
        else return '';
    }

    static getCRChallengeName (data) {
        if (data.cr < data.apl) return i18n(MODULE_NAME+".easy");
        else if (data.cr === data.apl) return i18n(MODULE_NAME+".average");
        else if (data.cr === data.apl + 1) return i18n(MODULE_NAME+".challenging");
        else if (data.cr === data.apl + 2) return i18n(MODULE_NAME+".hard");
        else if (data.cr >= data.apl + 3) return i18n(MODULE_NAME+".epic");
        else return '';
    }

    static getCR(combat) {
        var apl = { count: 0, levels: 0 };
        var xp = 0;

        //get the APL of friendly combatants
        $(combat.data.combatants).each(function (idx, combatant) {
            if (combatant.actor != undefined) {
                if (combatant.token.disposition == 1) {
                    apl.count = apl.count + 1;
                    apl.levels = apl.levels + combatant.actor.data.data.details.level;
                } else {
                    xp += (combatant.actor.data.data.details.xp.value);
                }
            }
        });

        var calcAPL = 0;
        if (apl.count > 0)
            calcAPL = Math.round(apl.levels / apl.count) + (apl.count < 4 ? -1 : (apl.count > 5 ? 1 : 0));

        //get the CR of any unfriendly/neutral
        var cr = 999;
        $(CombatDetails.xpchart).each(function () {
            if (this.xp >= xp)
                cr = Math.min(cr, this.cr);
        });

        return { cr: cr, apl: calcAPL };
    }

    static getDiceSound(hasMaestroSound = false) {
        //@ts-ignore
        const has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings")?.enabled : false;
        const playRollSounds = true; //game.settings.get("betterrolls5e", "playRollSounds")

        if (playRollSounds && !has3DDiceSound && !hasMaestroSound) {
            return CONFIG.sounds.dice;
        }

        return null;
    }

    static rgbToHex(r, g, b) {
        var componentToHex = function (c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    static createPixelArray(imgData, pixelCount, quality) {
        const pixels = imgData;
        const pixelArray = [];

        for (let i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
            offset = i * 4;
            r = pixels[offset + 0];
            g = pixels[offset + 1];
            b = pixels[offset + 2];
            a = pixels[offset + 3];

            // If pixel is mostly opaque and not white
            if (typeof a === 'undefined' || a >= 125) {
                if (!(r > 250 && g > 250 && b > 250)) {
                    pixelArray.push([r, g, b]);
                }
            }
        }
        return pixelArray;
    }

    static getPalette(url) {
        // Create custom CanvasImage object
        CombatDetails.canvasImage = new Image();
        CombatDetails.canvasImage.addEventListener('load', () => {
            let canvas = document.createElement('canvas');
            //@ts-ignore
            let context = getCanvas().getContext('2d');
            let width = getCanvas().dimensions.width = CombatDetails.canvasImage.naturalWidth;
            let height = getCanvas().dimensions.height = CombatDetails.canvasImage.naturalHeight;
            context.drawImage(CombatDetails.canvasImage, 0, 0, width, height);

            const imageData = context.getImageData(0, 0, getCanvas().dimensions.width, getCanvas().dimensions.height);
            const pixelCount = CombatDetails.canvasImage.width * CombatDetails.canvasImage.height;

            const pixelArray = CombatDetails.createPixelArray(imageData.data, pixelCount, 10);

            //getCanvas().remove();

            // Send array to quantize function which clusters values
            // using median cut algorithm
            const cmap = MMCQ.quantize(pixelArray, 5);
            const palette = cmap ? cmap.palette() : null;

            let element = $('.palette-fields');

            $(element).empty();
            for (let i = 0; i < palette.length; i++) {
                var hexCode = CombatDetails.rgbToHex(palette[i][0], palette[i][1], palette[i][2]);
                $(element).append($('<div>').addClass('background-palette').attr('title', hexCode).css({ backgroundColor: hexCode }).on('click', $.proxy(CombatDetails.updateSceneBackground, CombatDetails, hexCode)));
            }

            //const dominantColor = palette[0];
        });
        CombatDetails.canvasImage.src = url;
    };

    // static async createThumbnail(img) {
    //     const newImage = img !== undefined;

    //     // Load required textures to create the thumbnail
    //     img = img ?? this.data.img;
    //     const toLoad = [img];
    //     await TextureLoader.loader.load(toLoad);

    //     // First load the background texture to get dimensions
    //     const bg = img ? await loadTexture(img) : null;

    //     // Get the target dimensions for the canvas
    //     const dims = duplicate(this.data);
    //     if (newImage) {
    //         dims.width = bg.width;
    //         dims.height = bg.height;
    //     }
    //     const d = Canvas.getDimensions(dims);

    //     // Create a container and add a transparent graphic to enforce the size
    //     const c = new PIXI.Container();
    //     const g = c.addChild(new PIXI.Graphics());
    //     g.beginFill(0xFFFFFF, 0.0).drawRect(0, 0, d.sceneWidth, d.sceneHeight);

    //     // Add the background image
    //     if (bg) {
    //         const s = new PIXI.Sprite(bg);
    //         s.width = d.sceneWidth;
    //         s.height = d.sceneHeight;
    //         c.addChild(s);
    //     }

    //     // Render the container to a thumbnail
    //     return ImageHelper.createThumbnail(c, { width, height });
    // }

    static async updateSceneBackground(hexCode) {
        await CombatDetails.currentScene.update({ backgroundColor: hexCode },{});
    }
}
