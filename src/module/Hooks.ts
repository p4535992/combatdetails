import { warn, error, debug, i18n, i18nFormat, log } from "../combatdetails";
import { AssignXPApp } from "./assignxp";
import { CombatDetails, combatposition, volume } from "./combatdetailsimpl";
import { MODULE_NAME } from './settings';
//@ts-ignore
// import { KeybindLib } from "/modules/keybind-lib/keybind-lib.js";

// const previewer = new SoundPreviewerApplication();

export let readyHooks = async () => {

  // setup all the hooks

  //@ts-ignore
  libWrapper.register(MODULE_NAME, 'Token.prototype._canDrag', CombatDetails.combatDetailsTokenPrototypeCanDragHandler, 'MIXED');

  /**
 * Handle combatant update
 */
Hooks.on("updateCombatant", function (context, parentId, data) {
  const combat = game.combats.get(parentId);
  if (combat) {
    const combatant = combat.data.combatants.find((o:Combat) => o.id === data.id);

    if (combatant.actor.owner) CombatDetails.checkCombatTurn();
  }
});

/**
 * Handle combatant delete
 */
Hooks.on("deleteCombatant", function (context, parentId, data) {
  let combat = game.combats.get(parentId);
  CombatDetails.checkCombatTurn();
});

/**
 * Handle combatant added
 */
Hooks.on("addCombatant", function (context, parentId, data) {
  let combat = game.combats.get(parentId);
  let combatant = combat.data.combatants.find((o:Combat) => o.id === data.id);

  if (combatant.actor.owner)
	  CombatDetails.checkCombatTurn();
});

/**
 * Combat update hook
 */

Hooks.on("deleteCombat", function (combat) {
    CombatDetails.tracker = false;   //if the combat gets deleted, make sure to clear this out so that the next time the combat popout gets rendered it repositions the dialog

    //set movement to free movement
    CombatDetails.tokenbar.changeGlobalMovement("free");

    new AssignXPApp(combat, undefined).render(true);

    if (game.combats.combats.length == 0 && game.settings.get(MODULE_NAME, 'close-combat-when-done')) {
        const tabApp = ui["combat"];
        tabApp.close();
    }

});

Hooks.on("updateCombat", function (data, delta) {
    CombatDetails.checkCombatTurn();

    $(CombatDetails.tokenbar.tokens).each(function () {
        this.token.unsetFlag(MODULE_NAME, "nofified");
    });

	log("update combat", data);
	if(game.settings.get(MODULE_NAME, "opencombat") && delta.round === 1 && data.turn === 0 && data.started === true){
		//new combat, pop it out
		const tabApp = ui["combat"];
		tabApp.renderPopout();

        if (ui.sidebar.activeTab !== "chat")
            ui.sidebar.activateTab("chat");

        //set movement to combat only
        CombatDetails.tokenbar.changeGlobalMovement("combat");
    }

    if (combatposition() !== '' && delta.active === true) {
        //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
        CombatDetails.tracker = false;   //delete this so that the next render will reposition the popout, changin between combats changes the height
    }

	if (!game.user.isGM && Object.keys(delta).some((k) => k === "round")) {
		AudioHelper.play({src: CombatDetails.ROUND_SOUND, volume: volume(), autoplay: false, loop: false}, true);
	}
});

/**
 * Ready hook
 */
Hooks.on("ready", CombatDetails.ready);

Hooks.on('renderCombatTracker', async (app, html, options) => {
	if(!CombatDetails.tracker && app.options.id == "combat-popout"){
		CombatDetails.tracker = true;

		if(combatposition() !== ''){
        CombatDetails.repositionCombat(app);
		}
	}
});

Hooks.on('closeCombatTracker', async (app, html) => {
	CombatDetails.tracker = false;
});

Hooks.on('renderTokenHUD', async (app, html, options) => {
    CombatDetails.element = html;
    CombatDetails.tokenHUD = app;
    $('.col.left .control-icon.target', html).insertBefore($('#token-hud .col.left .control-icon.config'));
});

Hooks.on('renderCombatTracker', async (app, html, options) => {
    if (game.user.isGM && game.combat && !game.combat.started && game.settings.get(MODULE_NAME, 'show-combat-cr')) {
        //calculate CR
        let data = CombatDetails.getCR(game.combat);

        if ($('#combat-round .encounter-cr-row').length == 0 && game.combat.data.combatants.length > 0) {
            $('<nav>').addClass('encounters flexrow encounter-cr-row')
                .append($('<h3>').html('CR: ' + CombatDetails.getCRText(data.cr)))
                .append($('<div>').addClass('encounter-cr').attr('rating', CombatDetails.getCRChallenge(data)).html(CombatDetails.getCRChallengeName(data)))
                .insertAfter($('#combat-round .encounters:last'));
        }
    }

    if (game.combat == undefined) {
        $('#combat-round h3', html).css({ fontSize: '16px', lineHeight: '15px'});
    }

    if (!game.user.isGM && game.combat && game.combat.started) {
        $('.combat-control[data-control="previousTurn"],.combat-control[data-control="nextTurn"]:last').css({visibility:'hidden'});
    }
});

Hooks.on('renderChatLog', (app, html, options) => {
    if (game.user.isGM) {
        $('<a>').addClass('button confetti').html('🎉').insertAfter($('#chat-controls .chat-control-icon', html)).on('click', function () {
            if (window['confetti']) {
                const shootConfettiProps = window['confetti'].getShootConfettiProps(2);
                window['confetti'].shootConfetti(shootConfettiProps);
            }
        });
        $('.confetti-buttons', html).hide();
    }
});

Hooks.on('renderSceneConfig', async (app, html, options) => {
    if (game.settings.get(MODULE_NAME, 'scene-palette')) {
        CombatDetails.currentScene = app.object;

        if (CombatDetails.currentScene.img != undefined) {
            let backgroundColor = $('input[name="backgroundColor"]').parents('.form-group:first');

            $('<div>')
                .addClass('form-group')
                .append($('<label>').html('Background Palette'))
                .append($('<div>').addClass('form-fields palette-fields'))
                .insertAfter(backgroundColor);

            CombatDetails.getPalette(CombatDetails.currentScene.img);
            //get dimensions
            loadTexture(CombatDetails.currentScene.img).then((bg:any) => {
                if (bg != undefined) {
                    $('.background-size.width').html(bg.width);
                    $('.background-size.height').html(bg.height);
                }
            });
        }

        $('<div>')
            .addClass('background-size width')
            .insertAfter($('input[name="width"]'));
        $('<div>')
            .addClass('background-size height')
            .insertAfter($('input[name="height"]'));

        $('input.image[name="img"]').on('change', function () {
            let img = String($(this).val());
            CombatDetails.getPalette(img);
            loadTexture(img).then((bg:any) => {
                if (bg != undefined) {
                    $('.background-size.width').html(bg.width);
                    $('.background-size.height').html(bg.height);
                }
            });
        })
    }
  });

  // Register custom sheets (if any)

}

export let setupHooks = () => {

}



export let initHooks = () => {
  warn("Init Hooks processing");

  CombatDetails.init();
}

