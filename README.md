
![](https://img.shields.io/badge/Foundry-v0.7.9-informational)

# Combat Details

Add-On Module for Foundry VTT

This is a small module I created to open a notification that the players turn is next, or that it's their turn.
Based on the Combat Ready! module.  I'm just learning how to write code for Foundry VTT.

## Known issue/Limitation

## Installation

It's always easiest to install modules from the in game add-on browser.

To install this module manually:
1.  Inside the Foundry "Configuration and Setup" screen, click "Add-on Modules"
2.  Click "Install Module"
3.  In the "Manifest URL" field, paste the following url:
`https://raw.githubusercontent.com/ironmonk88/combatdetails/master/src/module.json`
4.  Click 'Install' and wait for installation to complete
5.  Don't forget to enable the module in game using the "Manage Module" button

### libWrapper

This module uses the [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) library for wrapping core methods. It is a hard dependency and it is recommended for the best experience and compatibility with other modules.

## Features

Shows a graphic + sound for players a round just before a player's turn (Next Up) and during their turn.

It uses a light-box style darkening of the canvas to catch their attention as well as an animated graphic + sound. The player then needs to click the banner to either acknowledge their turn is coming up, or take their turn. If they somehow  *still* don't know its their turn then that's a problem between chair and keyboard.

Note that for "Next UP" rather than having the graphic go away entirely, it just puts opacity on the banner as a constant reminder for the player to plan for their turn for when it does come up. Works with hidden combatants too, such that even if there's a block of hidden enemies you're working on as GM, they'll know when their turn is 'next' due to the graphic as to not catch them by surprise.

The combat timer is simply a bar along the bottom of the screen. By default it is  configured for 3m, but this can be changed in the settings. When the bar reaches 3m, or the custom value, an 'expired' sound will play, but it does not  automatically advance the turn. Shame is good enough in my opinion. If you need  to pause the timer, it responds to FVTT's pause mechanic.


## Note

This module was made by Ken L. This repo is only used to handle upkeep for future FVTT versions. 

## [Changelog](./changelog.md)

## Issues

- Users should report issues to the github issues. Reaching out on Discord is a good option as well, but please follow-up with a github issue
- Try clearing all tokens using the new button before selecting/targeting other tokens. this should resolve most issues.

Any issues, bugs, or feature requests are always welcome to be reported directly to the [Issue Tracker](https://github.com/ironmonk88/combatdetails/issues ), or using the [Bug Reporter Module](https://foundryvtt.com/packages/bug-reporter/).

## Credit

Thanks to anyone who helps me with this code! I appreciate the user community's feedback on this project!

- Foundry VTT discord community for always helping me out.

- [Combat Ready](https://github.com/smilligan93/combatready) ty to [smilligan93](https://github.com/smilligan93)
- [Combat Ready (fork by mraljabry)](https://github.com/mraljabry/combatready) ty to [mraljabry](https://github.com/mraljabry/)

## Acknowledgements

Bootstrapped with League of Extraordinary FoundryVTT Developers  [foundry-vtt-types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types).

Mad props to the 'League of Extraordinary FoundryVTT Developers' community which helped me figure out a lot.
