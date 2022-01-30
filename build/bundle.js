
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const fields = {
        signature: {id: 'signature', offset: 0x0000, size: 4, type: 'header', help: 'Signature'},
        version: {id: 'version', offset: 0x0004, size: 4, type: 'header', help: 'Version'},
        partyMembersStructOffset: {id: 'partyMembersStructOffset', offset: 0x0020, size: 4, type: 'header', help: 'Offset to NPC structs for party members'},
        partyMembersStructCount: {id: 'partyMembersStructCount', offset: 0x0024, size: 4, type: 'header', help: 'Count of NPC structs for party members (including protagonist)'},
        partyInventoryOffset: {id: 'partyInventoryOffset', offset: 0x0028, size: 4, type: 'header', help: 'Offset to party inventory'},
        partyInventoryCount: {id: 'partyInventoryCount', offset: 0x002c, size: 4, type: 'header', help: 'Count of party inventory'},
        nonPartyMembersStructOffset: {id: 'nonPartyMembersStructOffset', offset: 0x0030, size: 4, type: 'header', help: 'Offset to NPC structs for non-party members'},
        nonPartyMembersStructCount: {id: 'nonPartyMembersStructCount', offset: 0x0034, size: 4, type: 'header', help: 'Count of NPC structs for non-party members'},
        globalNamespaceVariablesOffset: {id: 'globalNamespaceVariablesOffset', offset: 0x0038, size: 4, type: 'header', help: 'Offset to Global namespace variables'},
        globalNamespaceVariablesCount: {id: 'globalNamespaceVariablesCount', offset: 0x003c, size: 4, type: 'header', help: 'Count of Global namespace variables'},
        gameTime: {id: 'gameTime', offset: 0x0008, size: 4, type: 'header', help: 'Game time'},
        partyGold: {id: 'partyGold', offset: 0x0018, size: 4, type: 'header', help: 'Party gold'},
        partyReputation: {id: 'partyReputation', offset: 0x0054, size: 4, type: 'header', help: 'Party reputation'},
        characterName: {id: 'characterName', offset: 0x000c, size: 8, type: 'npc-struct', help: 'Character Name'},
        characterCurrentArea: {id: 'characterCurrentArea', offset: 0x0018, size: 8, type: 'npc-struct', help: 'Character current area'},
        creOffset: {id: 'creOffset', offset: 0x0004, size: 4, type: 'npc-struct', help: 'Offset (from start of file) to CRE resource data for this character'},
        creSize: {id: 'creSize', offset: 0x0008, size: 4, type: 'npc-struct', help: 'Size of CRE resource data for this character'},
        name: {id: 'name', offset: 0x00c0, size: 32, type: 'npc-struct', help: 'Name'},
        strongestKillName: {id: 'strongestKillName', offset: 0x0000, size: 4, type: 'char-stats', help: 'Most powerful vanquished - Name'},
        strongestKillXP: {id: 'strongestKillXP', offset: 0x0004, size: 4, type: 'char-stats', help: 'Most powerful vanquished - XP Reward'},
        timeInParty: {id: 'timeInParty', offset: 0x0008, size: 4, type: 'char-stats', help: 'Time in party (1/15 seconds)'},
        timeJoined: {id: 'timeJoined', offset: 0x000c, size: 4, type: 'char-stats', help: 'Time Joined (1/15 seconds)'},
        isPartyMember: {id: 'isPartyMember', offset: 0x0010, size: 1, type: 'char-stats', help: 'Party member (0 = Not in party, 1 = In party)'},
        firstLetterOfCre: {id: 'firstLetterOfCre', offset: 0x0013, size: 1, type: 'char-stats', help: 'First letter of CRE resref (changed to *)'},
        chapterKillsXP: {id: 'chapterKillsXP', offset: 0x0014, size: 4, type: 'char-stats', help: 'Kills - XP Gained (chapter)'},
        chapterKillsCount: {id: 'chapterKillsCount', offset: 0x0018, size: 4, type: 'char-stats', help: 'Kills - Number (chapter)'},
        gameKillsXP: {id: 'gameKillsXP', offset: 0x001c, size: 4, type: 'char-stats', help: 'Kills - XP (game)'},
        gameKillsCount: {id: 'gameKillsCount', offset: 0x0020, size: 4, type: 'char-stats', help: 'Kills - number (game)'},
        favouriteSpells: {id: 'favouriteSpells', offset: 0x0024, size: 4 * 8, type: 'char-stats', help: 'Favourite spells'},
        favouriteSpellCount: {id: 'favouriteSpellCount', offset: 0x0044, size: 4 * 2, type: 'char-stats', help: 'Favourite spell count'},
        favouriteWeapons: {id: 'favouriteWeapons', offset: 0x004c, size: 4 * 8, type: 'char-stats', help: 'Favourite weapons'},
        favouriteWeaponTime: {id: 'favouriteWeaponTime', offset: 0x006c, size: 4 * 2, type: 'char-stats', help: 'Favourite weapon time (time equipped in combat - 1/15 seconds)'},
        creSignature: {id: 'signature', offset: 0x0000, size: 4, type: 'cre', help: 'Signature'},
        creVersion: {id: 'version', offset: 0x0004, size: 4, type: 'cre', help: 'Version'},
        creatureFlags: {id: 'creatureFlags', offset: 0x0010, size: 4, type: 'cre', help: 'Creature flags'},
        experienceForKill: {id: 'experienceForKill', offset: 0x0014, size: 4, type: 'cre', help: 'XP (gained for killing this creature)'},
        experiencePoints: {id: 'experiencePoints', offset: 0x0018, size: 4, type: 'cre', help: 'Experience points'},
        goldCarried: {id: 'goldCarried', offset: 0x001c, size: 4, type: 'cre', help: 'Gold carried'},
        permanentStatusFlags: {id: 'permanentStatusFlags', offset: 0x0020, size: 4, type: 'cre', help: 'Permanent Status Flags'},
        currentHitPoints: {id: 'currentHitPoints', offset: 0x0024, size: 2, type: 'cre', help: 'Current hit points'},
        maxHitPoints: {id: 'maxHitPoints', offset: 0x0026, size: 2, type: 'cre', help: 'Max hit points'},
        animation: {id: 'animation', offset: 0x0028, size: 4, type: 'cre', help: 'Animation ID'},
        metalColour: {id: 'metalColour', offset: 0x002c, size: 1, type: 'cre', help: 'Metal Colour Index'},
        minorColour: {id: 'minorColour', offset: 0x002d, size: 1, type: 'cre', help: 'Minor Colour Index'},
        majorColour: {id: 'majorColour', offset: 0x002e, size: 1, type: 'cre', help: 'Major Colour Index'},
        skinColour: {id: 'skinColour', offset: 0x002f, size: 1, type: 'cre', help: 'Skin Colour Index'},
        leatherColour: {id: 'leatherColour', offset: 0x0030, size: 1, type: 'cre', help: 'Leather Colour Index'},
        armorColour: {id: 'armorColour', offset: 0x0031, size: 1, type: 'cre', help: 'Armor Colour Index'},
        hairColour: {id: 'hairColour', offset: 0x0032, size: 1, type: 'cre', help: 'Hair Colour Index'},
        mediumPortrait: {id: 'mediumPortrait', offset: 0x0034, size: 8, type: 'cre', help: 'Medium portrait'},
        largePortrait: {id: 'largePortrait', offset: 0x003c, size: 8, type: 'cre', help: 'Large portrait'},
        reputation: {id: 'reputation', offset: 0x0044, size: 1, type: 'cre', help: 'Reputation'},
        acNatural: {id: 'acNatural', offset: 0x0046, size: 2, type: 'cre', help: 'AC (Natural)'},
        acEffective: {id: 'acEffective', offset: 0x0048, size: 2, type: 'cre', help: 'AC (Effective)'},
        acCrushing: {id: 'acCrushing', offset: 0x004a, size: 2, type: 'cre', help: 'AC (Crushing Attacks Modifier)'},
        acMissile: {id: 'acMissile', offset: 0x004c, size: 2, type: 'cre', help: 'AC (Missile Attacks Modifier)'},
        acPiercing: {id: 'acPiercing', offset: 0x004e, size: 2, type: 'cre', help: 'AC (Piercing Attacks Modifier)'},
        acSlashing: {id: 'acSlashing', offset: 0x0050, size: 2, type: 'cre', help: 'AC (Slashing Attacks Modifier)'},
        thac0: {id: 'thac0', offset: 0x0052, size: 1, type: 'cre', help: 'THAC0 (1-25)'},
        attacksPerRound: {id: 'attacksPerRound', offset: 0x0053, size: 1, type: 'cre', help: 'Number of attacks (1-5)'},
        saveVsDeath: {id: 'saveVsDeath', offset: 0x0054, size: 1, type: 'cre', help: 'Save versus death (0-20)'},
        saveVsWands: {id: 'saveVsWands', offset: 0x0055, size: 1, type: 'cre', help: 'Save versus wands (0-20)'},
        saveVsPolymorph: {id: 'saveVsPolymorph', offset: 0x0056, size: 1, type: 'cre', help: 'Save versus polymorph (0-20)'},
        saveVsBreath: {id: 'saveVsBreath', offset: 0x0057, size: 1, type: 'cre', help: 'Save versus breath attacks (0-20)'},
        saveVsSpells: {id: 'saveVsSpells', offset: 0x0058, size: 1, type: 'cre', help: 'Save versus spells (0-20)'},
        resistFire: {id: 'resistFire', offset: 0x0059, size: 1, type: 'cre', help: 'Resist Fire (0-100)'},
        resistCold: {id: 'resistCold', offset: 0x005a, size: 1, type: 'cre', help: 'Resist Cold (0-100)'},
        resistElectricity: {id: 'resistElectricity', offset: 0x005b, size: 1, type: 'cre', help: 'Resist Electricity (0-100)'},
        resistAcid: {id: 'resistAcid', offset: 0x005c, size: 1, type: 'cre', help: 'Resist Acid (0-100)'},
        resistMagic: {id: 'resistMagic', offset: 0x005d, size: 1, type: 'cre', help: 'Resist Magic (0-100)'},
        resistMagicFire: {id: 'resistMagicFire', offset: 0x005e, size: 1, type: 'cre', help: 'Resist Magic Fire (0-100)'},
        resistMagicCold: {id: 'resistMagicCold', offset: 0x005f, size: 1, type: 'cre', help: 'Resist Magic Cold (0-100)'},
        resistSlashing: {id: 'resistSlashing', offset: 0x0060, size: 1, type: 'cre', help: 'Resist Slashing (%) (0-100)'},
        resistCrushing: {id: 'resistCrushing', offset: 0x0061, size: 1, type: 'cre', help: 'Resist Crushing (%) (0-100)'},
        resistPiercing: {id: 'resistPiercing', offset: 0x0062, size: 1, type: 'cre', help: 'Resist Piercing (%) (0-100)'},
        resistMissile: {id: 'resistMissile', offset: 0x0063, size: 1, type: 'cre', help: 'Resist Missile (%) (0-100)'},
        hideInShadows: {id: 'hideInShadows', offset: 0x0045, size: 1, type: 'cre', help: 'Hide in Shadows (base)'},
        detectIllusion: {id: 'detectIllusion', offset: 0x0064, size: 1, type: 'cre', help: 'Detect illusion (min 0)'},
        setTraps: {id: 'setTraps', offset: 0x0065, size: 1, type: 'cre', help: 'Set traps (min 0)'},
        lockpicking: {id: 'lockpicking', offset: 0x0067, size: 1, type: 'cre', help: 'Lockpicking (min 0)'},
        moveSilently: {id: 'moveSilently', offset: 0x0068, size: 1, type: 'cre', help: 'Move silently (min 0)'},
        findDisarmTraps: {id: 'findDisarmTraps', offset: 0x0069, size: 1, type: 'cre', help: 'Find/disarm traps (min 0)'},
        pickPockets: {id: 'pickPockets', offset: 0x006a, size: 1, type: 'cre', help: 'Pick pockets (min 0)'},
        loreLevel: {id: 'loreLevel', offset: 0x0066, size: 1, type: 'cre', help: 'Lore level (0-100)'},
        fatigue: {id: 'fatigue', offset: 0x006b, size: 1, type: 'cre', help: 'Fatigue (0-100)'},
        intoxication: {id: 'intoxication', offset: 0x006c, size: 1, type: 'cre', help: 'Intoxication (0-100)'},
        luck: {id: 'luck', offset: 0x006d, size: 1, type: 'cre', help: 'Luck'},
        turnUndead: {id: 'turnUndead', offset: 0x0082, size: 1, type: 'cre', help: 'Turn undead level'},
        trackingSkill: {id: 'trackingSkill', offset: 0x0083, size: 1, type: 'cre', help: 'Tracking skill (0-100)'},
        level1: {id: 'level1', offset: 0x0234, size: 1, type: 'cre', help: 'Level first class (0-100)'},
        level2: {id: 'level2', offset: 0x0235, size: 1, type: 'cre', help: 'Level second class (0-100)'},
        level3: {id: 'level3', offset: 0x0236, size: 1, type: 'cre', help: 'Level third class (0-100)'},
        strength: {id: 'strength', offset: 0x0238, size: 1, type: 'cre', help: 'Strength (1-25)'},
        strengthBonus: {id: 'strengthBonus', offset: 0x0239, size: 1, type: 'cre', help: 'Strength % bonus (0-100)'},
        intelligence: {id: 'intelligence', offset: 0x023a, size: 1, type: 'cre', help: 'Intelligence (1-25)'},
        wisdom: {id: 'wisdom', offset: 0x023b, size: 1, type: 'cre', help: 'Wisdom (1-25)'},
        dexterity: {id: 'dexterity', offset: 0x023c, size: 1, type: 'cre', help: 'Dexterity (1-25)'},
        constitution: {id: 'constitution', offset: 0x023d, size: 1, type: 'cre', help: 'Constitution (1-25)'},
        charisma: {id: 'charisma', offset: 0x023e, size: 1, type: 'cre', help: 'Charisma (1-25)'},
        morale: {id: 'morale', offset: 0x023f, size: 1, type: 'cre', help: 'Morale (0-20)'},
        moraleBreak: {id: 'moraleBreak', offset: 0x0240, size: 1, type: 'cre', help: 'Morale break (0-20)'},
        moraleRecoveryTime: {id: 'moraleRecoveryTime', offset: 0x0242, size: 2, type: 'cre', help: 'Morale recovery time'},
        racialEnemy: {id: 'racialEnemy', offset: 0x0241, size: 1, type: 'cre', help: 'Racial enemy'},
        kit: {id: 'kit', offset: 0x0244, size: 4, type: 'cre', help: 'Kit'},
        enemyAlly: {id: 'enemyAlly', offset: 0x0270, size: 1, type: 'cre', help: 'Enemy-Ally'},
        general: {id: 'general', offset: 0x0271, size: 1, type: 'cre', help: 'General'},
        race: {id: 'race', offset: 0x0272, size: 1, type: 'cre', help: 'Race'},
        class: {id: 'class', offset: 0x0273, size: 1, type: 'cre', help: 'Class'},
        gender: {id: 'gender', offset: 0x0275, size: 1, type: 'cre', help: 'Gender'},
        alignment: {id: 'alignment', offset: 0x027b, size: 1, type: 'cre', help: 'Alignment'},
        nonPcCharsName: {id: 'nonPcCharsName', offset: 0x0280, size: 32, type: 'cre', help: 'NPC Characters Name'},
        specific: {id: 'specific', offset: 0x0274, size: 1, type: 'cre', help: 'Specific'},
        weaponProficiency: {id: 'weaponProficiency', offset: 0x000c, size: 1, type: 'proficiencies', help: 'Weapon proficiency level'},
        proficiencyType: {id: 'proficiencyType', offset: 0x0010, size: 1, type: 'proficiencies', help: 'Weapon proficiency name'},
    };

    /*
     * Lore is calculated as ((level * rate) + int_bonus + wis_bonus).
     * Intelligence and wisdom bonuses are from LOREBON.2DA and the rate is the lookup value in LORE.2DA, based on class.
     * For multiclass characters, (level * rate) is calculated for both classes separately and the higher of the
     * two values is used - they are not cumulative.
     *
     * Highest attained level in class (0-100).
     * For dual/multi class characters, the levels for each class are split between 0x0234, 0x0235 and 0x0236
     * according to the internal class name, i.e. for a FIGHTER_THIEF 0x0234 will hold the fighter level,
     * 0x0235 will hold the thief level and 0x0236 will be 0.
     *
     * Morale default value is 10 (capped 0 — 20)
     * It is unclear what increases/decreases Morale or by how much.
     * A party member dying, and taking damage while already low on health are the obvious ways to lose Morale.
     *
     * Morale break is the lower bound for avoiding a morale failure.
     * If Morale is lower than this value, morale failure occurs, if Morale is higher, any morale failure is removed.
     * A value of 0 is effectively immune to morale failure though.
     * No creature has a Morale break value higher than 10 as they would always be in morale failure.
     * Morale also fails if Morale break = current Morale value, so 20 Morale will fail if Morale break is also 20.
     * Except if Morale break is 0, which cannot fail.
     *
     * Morale recovery time is the period of time (should be seconds) it takes to recover some amount of Morale naturally
     * (towards a value of 10, from a higher or lower value).
     * It's unknown what's going on internally though, as it's not consistent, and even the details given by CTRL+M
     * don't update Morale in real-time.
     */

    /**
     * @param {Number} seconds
     * @returns {String}
     */
    const secondsToDhms = (seconds) => {
        seconds = Number(seconds);
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
        const hDisplay = h > 0 ? h + (h === 1 ? " hour" : " hours") : "";
        return dDisplay + hDisplay;
    };

    class GamV20HexEditor {
        /*
         * Names                        Bytes   Bits    Value range                         # Values            Comment
         * -------------------------------------------------------------------------------------------------------------------------------
         * char, byte                   1       8       -128 to +127                        256                 Signed Byte or character
         * uchar, ubyte                 1       8       0 to 255                            256                 Unsigned Byte or character
         * short, int16                 2       16      −32,768 to +32,767                  65,536              Signed 16 bit integer
         * ushort, uint16, word         2       16      0 to 65535                          65,536              Unsigned 16 bit integer
         * int, int32, long             4       32      −2,147,483,648 to +2,147,483,647    4,294,967,295       Signed 32 bit integer
         * uint, uint32, ulong, dword   4       32      0 to 4,294,967,295                  4,294,967,295       Unsigned 32 bit integer
         */

        _hexArray
        _headerOffset
        _partyMembersStructsOffsets = []
        _partyMembersCreOffsets = []
        _partyMembersStatsOffsets = []
        _partyMembersProficienciesOffsets = []
        _isValidGamFile = false

        /**
         * @param {Array.<Number>} uint8array
         * @returns {Array.<String>}
         */
        constructor(uint8array) {
            let hexArray = [];
            for (let i in uint8array) {
                hexArray.push((0 + uint8array[i].toString(16)).slice(-2));
            }
            this._hexArray = hexArray;
            this._headerOffset = 0x0000;
            this._isValidGamFile = this._validateGamFile();
            if (this._isValidGamFile) {
                this._locateCharactersOffsets();
            }
        }

        /**
         * @returns {Boolean}
         */
        get isValidGamFile() {
            return this._isValidGamFile
        }

        /**
         * @param {Number} characterIdx
         * @returns {Number}
         */
        getCharacterProficienciesCount(characterIdx) {
            return this._partyMembersProficienciesOffsets[characterIdx].length
        }

        exportAsInt8Array() {
            return new Uint8Array(this._hexArray.map(byte => parseInt(byte, 16)));
        }

        readField(fieldId, characterIdx, proficiencyIdx) {
            const field = fields[fieldId];
            if (!field) {
                throw `Invalid field ${fieldId}`
            }
            const startOffset = this._getStartOffset(field, characterIdx, proficiencyIdx);
            return this._readOffsetValue({...field, offset: startOffset + field.offset})
        }

        _getStartOffset(field, characterIdx, proficiencyIdx) {
            switch (field.type) {
                case 'header':
                    return 0
                case 'cre':
                    return this._partyMembersCreOffsets[characterIdx]
                case 'npc-struct':
                    return this._partyMembersStructsOffsets[characterIdx]
                case 'char-stats':
                    return this._partyMembersStatsOffsets[characterIdx]
                case 'proficiencies':
                    return this._partyMembersProficienciesOffsets[characterIdx][proficiencyIdx]
                default:
                    throw `Start offset not found for field ${field.id}`
            }
        }

        writeField(newValue, fieldId, characterIdx, proficiencyIdx) {
            const field = fields[fieldId];
            if (!field) {
                throw `Invalid field ${fieldId}`
            }
            const startOffset = this._getStartOffset(field, characterIdx, proficiencyIdx);
            return this._writeOffsetValue({...field, offset: startOffset + field.offset, value: newValue})
        }

        /**
         * @returns {Boolean}
         * @private
         */
        _validateGamFile() {
            return this.readField('signature') === 'GAME'
                && this.readField('version') === 'V2.0'
        }

        /**
         * @returns {Array.<Number>}
         * @private
         */
        _locateCharactersOffsets() {
            const partyMembersStructOffset = this.readField('partyMembersStructOffset');
            const partyMembersStructCount = this.readField('partyMembersStructCount');
            const structSize = 352;

            for (let i = 0, iMax = partyMembersStructCount; i < iMax; i++) {
                this._partyMembersStructsOffsets.push(partyMembersStructOffset + (structSize * i));
            }
            for (let i = 0, iMax = partyMembersStructCount; i < iMax; i++) {
                this._partyMembersCreOffsets.push(this.readField('creOffset', i));
            }
            for (let i = 0, iMax = partyMembersStructCount; i < iMax; i++) {
                this._partyMembersStatsOffsets.push(this._partyMembersStructsOffsets[i] + 0x00e4);
            }

            // Locate proficiencies of party members by pattern.
            // TODO: investigate how to locate these offsets more efficiently
            // TODO: investigate how to distinguish proficiencies for 1st / 2nd dual class case
            const pattern = [
                'e9', '00', '00', '00',
                '??', '00', '00', '00', // ?
                '00', '00', '00', '00',
                '??', '00', '00', '00', // Weapon proficiency
                '??', '00', '00', '00', // Proficiency type
                '09', '00', '00', '00',
                '00', '00', '00', '00',
                '64', '00'
            ];
            for (let i = 0, iMax = partyMembersStructCount; i < iMax; i++) {
                let proficienciesOffsets = [];
                let o = this.readField('creOffset', i);
                let oMax = o + this.readField( 'creSize', i);
                for (; o < oMax; o++) {
                    for (let p = 0, pMax = pattern.length; p < pMax; p++) {
                        if (pattern[p] === '??') {
                            continue
                        }
                        if (this._hexArray[o + p] !== pattern[p]) {
                            break
                        }
                        if (p === (pattern.length - 1)) { // Pattern match!
                            proficienciesOffsets.push(o);
                        }
                    }
                }
                this._partyMembersProficienciesOffsets.push(proficienciesOffsets);
            }
        }

        /**
         * @param offset Offset
         * @param size Size (in bytes)
         * @returns {number}
         * @private
         */
        _getIntLittleEndian(offset, size) {
            return parseInt('0x' + this._hexArray.slice(offset, offset + size).reverse().join(''), 16)
        }

        /**
         * @param offset Offset
         * @param size Size (in bytes)
         * @returns {number}
         * @private
         */
        _getIntBigEndian(offset, size) {
            return parseInt('0x' + this._hexArray.slice(offset, offset + size).join(''), 16)
        }

        /**
         * @param offset Offset
         * @param size Size (in bytes)
         * @returns {String}
         * @private
         */
        _toBinaryString(offset, size) {
            return this._getIntBigEndian(offset, size).toString(2).padStart(size * 8, '0')
        }

        /**
         * @param offset Offset
         * @param size Size (in bytes)
         * @param removePadding Remove empty bytes (0x00) from the end
         * @returns {number}
         */
        _getCharsString(offset, size, removePadding = true) {
            if (!removePadding) {
                return this._hexArray.slice(offset, offset + size)
                    .map(hex => String.fromCharCode(parseInt(hex, 16)))
                    .join('')
            }

            let bytes = this._hexArray.slice(offset, offset + size).reverse();
            let paddingCount = 0;
            for (const i in bytes) {
                if (bytes[i] === '00') {
                    ++paddingCount;
                    continue
                }
                break
            }

            if (paddingCount > 0) {
                return bytes.slice(paddingCount)
                    .reverse()
                    .map(hex => String.fromCharCode(parseInt(hex, 16)))
                    .join('')
            }

            return bytes.reverse()
                .map(hex => String.fromCharCode(parseInt(hex, 16)))
                .join('')
        }

        _readOffsetValue({offset, size, id}) {
            switch (id) {
                case 'isPartyMember':
                    return 1 === this._getIntLittleEndian(offset, size)
                case 'creatureFlags':
                    return this._toBinaryString(offset, size)
                case 'gameTime':
                    return secondsToDhms((this._getIntLittleEndian(offset, size) - 2100) * 12)
                case 'partyReputation':
                case 'reputation':
                    return this._getIntLittleEndian(offset, size) / 10
                case 'timeInParty':
                case 'timeJoined':
                    return secondsToDhms(this._getIntLittleEndian(offset, size) * 15)
                case 'signature':
                case 'version':
                case 'creSignature':
                case 'creVersion':
                    return this._getCharsString(offset, size, false)
                case 'mediumPortrait':
                case 'largePortrait':
                case 'name':
                case 'characterName':
                case 'characterCurrentArea':
                case 'firstLetterOfCre':
                case 'nonPcCharsName':
                    return this._getCharsString(offset, size)
                case 'thac0':
                case 'attacksPerRound':
                case 'saveVsDeath':
                case 'saveVsWands':
                case 'saveVsPolymorph':
                case 'saveVsBreath':
                case 'saveVsSpells':
                    const int8 = this._getIntLittleEndian(offset, size);
                    return int8 < 128 ? int8 : -(256 - int8)
                case 'acNatural':
                case 'acEffective':
                case 'acCrushing':
                case 'acMissile':
                case 'acPiercing':
                case 'acSlashing':
                    const int16 = this._getIntLittleEndian(offset, size);
                    return int16 < 32768 ? int16 : -(65536 - int16)
                case 'partyGold':
                case 'goldCarried':
                case 'experiencePoints':
                case 'experienceForKill':
                case 'currentHitPoints':
                case 'maxHitPoints':
                case 'resistFire':
                case 'resistCold':
                case 'resistElectricity':
                case 'resistAcid':
                case 'resistMagic':
                case 'resistMagicFire':
                case 'resistMagicCold':
                case 'resistSlashing':
                case 'resistCrushing':
                case 'resistPiercing':
                case 'resistMissile':
                case 'hideInShadows':
                case 'detectIllusion':
                case 'setTraps':
                case 'lockpicking':
                case 'moveSilently':
                case 'findDisarmTraps':
                case 'pickPockets':
                case 'loreLevel':
                case 'fatigue':
                case 'intoxication':
                case 'luck':
                case 'turnUndead':
                case 'trackingSkill':
                case 'level1':
                case 'level2':
                case 'level3':
                case 'strength':
                case 'strengthBonus':
                case 'intelligence':
                case 'wisdom':
                case 'dexterity':
                case 'constitution':
                case 'charisma':
                case 'morale':
                case 'moraleBreak':
                case 'moraleRecoveryTime':
                case 'partyMembersStructOffset':
                case 'partyMembersStructCount':
                case 'partyInventoryOffset':
                case 'partyInventoryCount':
                case 'nonPartyMembersStructOffset':
                case 'nonPartyMembersStructCount':
                case 'globalNamespaceVariablesOffset':
                case 'globalNamespaceVariablesCount':
                case 'racialEnemy':
                case 'enemyAlly':
                case 'general':
                case 'race':
                case 'class':
                case 'specific':
                case 'gender':
                case 'kit':
                case 'alignment':
                case 'strongestKillXP':
                case 'chapterKillsXP':
                case 'chapterKillsCount':
                case 'gameKillsXP':
                case 'gameKillsCount':
                case 'strongestKillName':
                case 'animation':
                case 'metalColour':
                case 'minorColour':
                case 'majorColour':
                case 'skinColour':
                case 'leatherColour':
                case 'armorColour':
                case 'hairColour':
                case 'creOffset':
                case 'creSize':
                case 'weaponProficiency':
                case 'proficiencyType':
                    return this._getIntLittleEndian(offset, size)
                default:
                    throw 'Field getter not defined'
            }
        }

        _writeIntLittleEndian(offset, size, value) {
            const newHexValues = parseInt(value, 10).toString(16).padStart(size * 2 , '0').match(/.{2}/g).reverse();
            for (let i = 0, iMax = size; i < iMax; i++) {
                this._hexArray[offset + i] = newHexValues[i];
            }
        }

        _writeOffsetValue({offset, size, id, value}) {
            switch (id) {
                case 'partyReputation':
                case 'reputation':
                    this._writeIntLittleEndian(offset, size, parseInt(value, 10) * 10);
                    break
                case 'thac0':
                case 'attacksPerRound':
                case 'saveVsDeath':
                case 'saveVsWands':
                case 'saveVsPolymorph':
                case 'saveVsBreath':
                case 'saveVsSpells':
                    const int8 = parseInt(value);
                    this._writeIntLittleEndian(offset, size, int8 < 0 ? 256 + int8 : int8);
                    break
                case 'acNatural':
                case 'acEffective':
                case 'acCrushing':
                case 'acMissile':
                case 'acPiercing':
                case 'acSlashing':
                    const int16 = parseInt(value);
                    this._writeIntLittleEndian(offset, size, int16 < 0 ? 65536 + int16 : int16);
                    break
                case 'partyGold':
                case 'goldCarried':
                case 'experiencePoints':
                case 'experienceForKill':
                case 'currentHitPoints':
                case 'maxHitPoints':
                case 'resistFire':
                case 'resistCold':
                case 'resistElectricity':
                case 'resistAcid':
                case 'resistMagic':
                case 'resistMagicFire':
                case 'resistMagicCold':
                case 'resistSlashing':
                case 'resistCrushing':
                case 'resistPiercing':
                case 'resistMissile':
                case 'hideInShadows':
                case 'detectIllusion':
                case 'setTraps':
                case 'lockpicking':
                case 'moveSilently':
                case 'findDisarmTraps':
                case 'pickPockets':
                case 'loreLevel':
                case 'fatigue':
                case 'intoxication':
                case 'luck':
                case 'turnUndead':
                case 'trackingSkill':
                case 'level1':
                case 'level2':
                case 'level3':
                case 'strength':
                case 'strengthBonus':
                case 'intelligence':
                case 'wisdom':
                case 'dexterity':
                case 'constitution':
                case 'charisma':
                case 'morale':
                case 'moraleBreak':
                case 'moraleRecoveryTime':
                case 'racialEnemy':
                case 'enemyAlly':
                case 'general':
                case 'race':
                case 'class':
                case 'specific':
                case 'gender':
                case 'kit':
                case 'alignment':
                case 'strongestKillXP':
                case 'chapterKillsXP':
                case 'chapterKillsCount':
                case 'gameKillsXP':
                case 'gameKillsCount':
                case 'weaponProficiency':
                    this._writeIntLittleEndian(offset, size, value);
                    break
                default:
                    throw 'Field getter not defined'
            }
        }
    }

    const portraits = [
        'AJANTISM',
        'ALORAM',
        'BAELOTHM',
        'BDIMOENM',
        'BDORCF1M',
        'BDORCM1M',
        'BDSHAF1M',
        'BDSHAM1M',
        'BDTMAM',
        'BDTMBM',
        'BDTMCM',
        'BDTMDM',
        'BDTMEM',
        'BDTMFM',
        'BDTMGM',
        'BDTMHM',
        'BDTMIM',
        'BDTMJLM',
        'BDTMKLM',
        'BDVICONM',
        'BRANWEM',
        'CAELARM',
        'CORANM',
        'DORNLM',
        'DYNAHEIM',
        'EDWINM',
        'ELDOTHM',
        'FALDORNM',
        'GARRICKM',
        'GENDWRFM',
        'GENMELFM',
        'GENMHLFM',
        'GLINTM',
        'HELMM',
        'HEPHERNM',
        'HVLNM',
        'IMOENM',
        'JAHEIRAM',
        'KAGAINM',
        'KHALIDM',
        'KIVANM',
        'MAN1M',
        'MAN2M',
        'MANLEY0M',
        'MANLEY1M',
        'MANLEY2M',
        'MANLEY3M',
        'MANLEY4M',
        'MANLEY5M',
        'MANLEY7M',
        'MANLEY8M',
        'MANLEY9M',
        'MANLEYXM',
        'MINSCM',
        'MKHIINM',
        'MONTARM',
        'NAERIEM',
        'NANOMENM',
        'NCERNDM',
        'NEDWINM',
        'NEERAM',
        'NHAERM',
        'NHORCM',
        'NIMOENM',
        'NJAHEIRM',
        'NJANM',
        'NKELDORM',
        'NKORGANM',
        'NMAZZYM',
        'NMINSCM',
        'NNALIAM',
        'NVALYGAM',
        'NVICONM',
        'NYOSHIMM',
        'OHHEXM',
        'OHHEXXM',
        'QUAYLEM',
        'RASAADM',
        'SAFANAM',
        'SAREVOKM',
        'SCHAELM',
        'SHARTELM',
        'SKANM',
        'SKIEM',
        'TIAXM',
        'UNKOWNM',
        'UNNAMEDM',
        'VICONIAM',
        'VOGHILNM',
        'WILSONM',
        'WOMAN1M',
        'WOMAN2M',
        'XANM',
        'XZARM',
        'YANNER1M',
        'YANNER2AM',
        'YANNER2BM',
        'YANNER2CM',
        'YANNER2DM',
        'YANNER2EM',
        'YANNER2FM',
        'YANNER2M',
        'YANNER3M',
        'YANNER4M',
        'YANNER5M',
        'YANNER6M',
        'YESLICKM',
    ];

    const genders = {
        1: "MALE",
        2: "FEMALE",
        3: "OTHER",
        4: "NIETHER",
        5: "BOTH",
        6: "SUMMONED",
        7: "ILLUSIONARY",
        8: "EXTRA",
        9: "SUMMONED_DEMON",
        10: "EXTRA2",
        11: "EXTRA3",
        12: "EXTRA4",
        13: "EXTRA5",
        14: "EXTRA6",
        15: "EXTRA7",
        16: "EXTRA8",
        17: "EXTRA9",
        18: "EXTRA10",
        66: "IMPRISONED_SUMMONED",
    };

    const races = {
        0: "NONE",
        1: "HUMAN",
        2: "ELF",
        3: "HALF_ELF",
        4: "DWARF",
        5: "HALFLING",
        6: "GNOME",
        7: "HALFORC",
        101: "ANKHEG",
        102: "BASILISK",
        103: "BEAR",
        104: "CARRIONCRAWLER",
        105: "DOG",
        106: "DOPPLEGANGER",
        107: "ETTERCAP",
        108: "GHOUL",
        109: "GIBBERLING",
        110: "GNOLL",
        111: "HOBGOBLIN",
        112: "KOBOLD",
        113: "OGRE",
        115: "SKELETON",
        116: "SPIDER",
        117: "WOLF",
        118: "WYVERN",
        119: "SLIME",
        120: "FAIRY",
        121: "DEMONIC",
        122: "LYCANTHROPE",
        123: "BEHOLDER",
        124: "MIND_FLAYER",
        125: "VAMPIRE",
        126: "VAMPYRE",
        127: "OTYUGH",
        128: "RAKSHASA",
        129: "TROLL",
        130: "UMBERHULK",
        131: "SAHUAGIN",
        132: "SHADOW",
        133: "SPECTRE",
        134: "WRAITH",
        135: "KUO-TOA",
        136: "MIST",
        137: "CAT",
        138: "DUERGAR",
        139: "MEPHIT",
        140: "MIMIC",
        141: "IMP",
        142: "GIANT",
        143: "ORC",
        144: "GOLEM",
        145: "ELEMENTAL",
        146: "DRAGON",
        147: "GENIE",
        148: "ZOMBIE",
        149: "STATUE",
        150: "LICH",
        151: "RABBIT",
        152: "GITHYANKI",
        153: "TIEFLING",
        154: "YUANTI",
        155: "DEMILICH",
        156: "SOLAR",
        157: "ANTISOLAR",
        158: "PLANATAR",
        159: "DARKPLANATAR",
        160: "BEETLE",
        161: "GOBLIN",
        162: "LIZARDMAN",
        164: "MYCONID",
        165: "BUGBEAR",
        166: "FEYR",
        167: "HOOK_HORROR",
        168: "SHRIEKER",
        169: "SALAMANDER",
        170: "BIRD",
        171: "MINOTAUR",
        172: "DRIDER",
        173: "SIMULACRUM",
        174: "HARPY",
        175: "SPECTRAL_UNDEAD",
        176: "SHAMBLING_MOUND",
        177: "CHIMERA",
        178: "HALF_DRAGON",
        179: "YETI",
        180: "KEG",
        181: "WILL-O-WISP",
        182: "MAMMAL",
        183: "REPTILE",
        184: "TREANT",
        185: "AASIMAR",
        199: "ETTIN",
        201: "SWORD",
        202: "BOW",
        203: "XBOW",
        204: "STAFF",
        205: "SLING",
        206: "MACE",
        207: "DAGGER",
        208: "SPEAR",
        209: "FIST",
        210: "HAMMER",
        211: "MORNINGSTAR",
        212: "ROBES",
        213: "LEATHER",
        214: "CHAIN",
        215: "PLATE",
        255: "NO_RACE",
    };

    const alignments = {
        0x00: "NONE",
        0x11: "LAWFUL_GOOD",
        0x12: "LAWFUL_NEUTRAL",
        0x13: "LAWFUL_EVIL",
        0x21: "NEUTRAL_GOOD",
        0x22: "NEUTRAL",
        0x23: "NEUTRAL_EVIL",
        0x31: "CHAOTIC_GOOD",
        0x32: "CHAOTIC_NEUTRAL",
        0x33: "CHAOTIC_EVIL",
        0x01: "MASK_GOOD",
        0x02: "MASK_GENEUTRAL",
        0x03: "MASK_EVIL",
        0x10: "MASK_LAWFUL",
        0x20: "MASK_LCNEUTRAL",
        0x30: "MASK_CHAOTIC",
    };

    /*
     * Info:
     * Dual-classed characters will detect only as their new class until their original class is re-activated, then they will detect as a multi-classed character.
     * Non-player classes (values strictly greater than 21) lack weapon slots (they have a single "attack" attack_button button instead), every other button is the same as a MAGE skillbar ⟹ mage_skillbar.
     * They have full access to activated item abilities, even those on weapons, just not the ability to switch weapons (or ammo).
     * The only exception is the WIZARD_EYE class — it has no skillbar buttons at all.
     */
    const classes = {
        1: "MAGE", // Detects mages (and sorcerers), though only single class & kits.
        2: "FIGHTER", // Detects fighters (and monks), though only single class & kits.
        3: "CLERIC", // Detects clerics, though only single class & kits.
        4: "THIEF", // Detects thieves, though only single class & kits.
        5: "BARD", // Detects bards, though only single class & kits.
        6: "PALADIN", // Detects paladins, though only single class & kits.
        7: "FIGHTER_MAGE",
        8: "FIGHTER_CLERIC",
        9: "FIGHTER_THIEF",
        10: "FIGHTER_MAGE_THIEF",
        11: "DRUID", // Detects druids, though only single class & kits.
        12: "RANGER", // Detects ranger, though only single class & kits.
        13: "MAGE_THIEF",
        14: "CLERIC_MAGE",
        15: "CLERIC_THIEF",
        16: "FIGHTER_DRUID",
        17: "FIGHTER_MAGE_CLERIC",
        18: "CLERIC_RANGER",
        19: "SORCERER", // Detects sorcerers, though only single class.
        20: "MONK", // Detects monks, though only single class.
        101: "ANKHEG",
        102: "BASILISK",
        103: "BASILISK_GREATER",
        104: "BEAR_BLACK",
        105: "BEAR_BROWN",
        106: "BEAR_CAVE",
        107: "BEAR_POLAR",
        108: "CARRIONCRAWLER",
        109: "DOG_WILD",
        110: "DOG_WAR",
        111: "DOPPLEGANGER",
        112: "DOPPLEGANGER_GREATER",
        113: "DRIZZT",
        114: "ELMINSTER",
        115: "ETTERCAP",
        116: "GHOUL",
        117: "GHOUL_REVEANT",
        118: "GHOUL_GHAST",
        119: "GIBBERLING",
        120: "GNOLL",
        121: "HOBGOBLIN",
        122: "KOBOLD",
        123: "KOBOLD_TASLOI",
        124: "KOBOLD_XVART",
        125: "OGRE",
        126: "OGRE_MAGE",
        127: "OGRE_HALFOGRE",
        128: "OGRE_OGRILLON",
        129: "SAREVOK",
        130: "FAIRY_SIRINE",
        131: "FAIRY_DRYAD",
        132: "FAIRY_NEREID",
        133: "FAIRY_NYMPH",
        134: "SKELETON",
        135: "SKELETON_WARRIOR",
        136: "SKELETON_BANEGUARD",
        137: "SPIDER_GIANT",
        138: "SPIDER_HUGE",
        139: "SPIDER_PHASE",
        140: "SPIDER_SWORD",
        141: "SPIDER_WRAITH",
        142: "VOLO",
        143: "WOLF",
        144: "WOLF_WORG",
        145: "WOLF_DIRE",
        146: "WOLF_WINTER",
        147: "WOLF_VAMPIRIC",
        148: "WOLF_DREAD",
        149: "WYVERN",
        150: "OLIVE_SLIME",
        151: "MUSTARD_JELLY",
        152: "OCRE_JELLY",
        153: "GREY_OOZE",
        154: "GREEN_SLIME",
        155: "INNOCENT",
        156: "FLAMING_FIST",
        157: "WEREWOLF",
        158: "WOLFWERE",
        159: "DEATHKNIGHT",
        160: "TANARI",
        161: "BEHOLDER",
        162: "MIND_FLAYER",
        163: "VAMPIRE",
        164: "VAMPYRE",
        165: "OTYUGH",
        166: "RAKSHASA",
        167: "TROLL",
        168: "UMBERHULK",
        169: "SAHUAGIN",
        170: "SHADOW",
        171: "SPECTRE",
        172: "WRAITH",
        173: "KUO-TOA",
        174: "MIST",
        175: "CAT",
        176: "DUERGAR",
        177: "MEPHIT",
        178: "MIMIC",
        179: "IMP",
        180: "GIANT",
        181: "ORC",
        182: "GOLEM_IRON",
        183: "GOLEM_FLESH",
        184: "GOLEM_STONE",
        185: "GOLEM_CLAY",
        186: "ELEMENTAL_AIR",
        187: "ELEMENTAL_FIRE",
        188: "ELEMENTAL_EARTH",
        189: "SPIDER_CENTEOL",
        190: "RED_DRAGON",
        191: "SHADOW_DRAGON",
        192: "SILVER_DRAGON",
        193: "GENIE_DJINNI",
        194: "GENIE_DAO",
        195: "GENIE_EFREETI",
        196: "GENIE_NOBLE_DJINNI",
        197: "GENIE_NOBLE_EFREETI",
        198: "ZOMBIE_NORMAL",
        199: "FOOD_CREATURE",
        200: "HUNTER_CREATURE",
        201: "LONG_SWORD",
        // 202: "LONG_BOW",
        202: "MAGE_ALL", // Detects mages, including single class, kits, multi-class, and dual-class, as well as sorcerers.
        203: "FIGHTER_ALL", // Detects fighters, including single class, kits, multi-class, and dual-class, as well as monks.
        204: "CLERIC_ALL", // Detects clerics, including single class, kits, multi-class, and dual-class.
        205: "THIEF_ALL", // Detects thieves, including single class, kits, multi-class, and dual-class.
        206: "BARD_ALL", // Detects bards, including single class, kits, multi-class, and dual-class.
        207: "PALADIN_ALL", // Detects paladins, including single class, kits, multi-class, and dual-class.
        208: "DRUID_ALL", // Detects druids, including single class, kits, multi-class, and dual-class.
        209: "RANGER_ALL", // Detects rangers, including single class, kits, multi-class, and dual-class.
        210: "WIZARD_EYE",
        211: "CANDLEKEEP_WATCHER",
        212: "AMNISH_SOLDIER",
        213: "TOWN_GUARD",
        219: "ELEMENTAL_WATER",
        220: "GREEN_DRAGON",
        221: "SOD_TMP",
        222: "SPECTRAL_TROLL",
        223: "WIGHT",
        255: "NO_CLASS",
    };

    const kits = {
        0x00000000: "NONE",
        0x40010000: "BERSERKER",
        0x40020000: "WIZARDSLAYER",
        0x40030000: "KENSAI",
        0x40040000: "CAVALIER",
        0x40050000: "INQUISITOR",
        0x40060000: "UNDEADHUNTER",
        0x00400000: "ABJURER",
        0x00800000: "CONJURER",
        0x01000000: "DIVINER",
        0x02000000: "ENCHANTER",
        0x04000000: "ILLUSIONIST",
        0x08000000: "INVOKER",
        0x10000000: "NECROMANCER",
        0x20000000: "TRANSMUTER",
        0x40000000: "TRUECLASS", // BARBARIAN, GENERALIST
        0x40070000: "FERALAN",
        0x40080000: "STALKER",
        0x40090000: "BEASTMASTER",
        0x400A0000: "ASSASSIN",
        0x400B0000: "BOUNTYHUNTER",
        0x400C0000: "SWASHBUCKLER",
        0x400D0000: "BLADE",
        0x400E0000: "JESTER",
        0x400F0000: "SKALD",
        0x40130000: "GODTALOS",
        0x40140000: "GODHELM",
        0x40150000: "GODLATHANDER",
        0x40100000: "TOTEMIC",
        0x40110000: "SHAPESHIFTER",
        0x40120000: "BEASTFRIEND",
        0x80000000: "WILDMAGE",
        0x40200000: "BLACKGUARD",
        0x40210000: "SHADOWDANCER",
        0x40220000: "DWARVEN_DEFENDER",
        0x40230000: "DRAGON_DISCIPLE",
        0x40240000: "DARK_MOON",
        0x40250000: "SUN_SOUL",
        0x40270000: "GRIZZLY_BEAR",
        0x40280000: "OHTYR",
    };

    const eas = {
        0: "ANYONE", // Includes all allegiances.
        1: "INANIMATE", // E.g. Sun Statue in Temple of Amaunator (rngsta01.cre)
        2: "PC", // Regular party members.
        3: "FAMILIAR", // Familiars of mages.
        4: "ALLY",
        5: "CONTROLLED", // Creatures fully under control of the player.
        6: "CHARMED", // Uncontrolled ally (green selection circle) of the player.
        7: "REALLYCHARMED", // Creatures fully under control of the player.
        28: "GOODBUTRED", // Creatures of same allegiance as party, but uses red (hostile) selection circles. Can not be controlled by the player.
        29: "GOODBUTBLUE", // Creatures of same allegiance as party, but uses blue (neutral) selection circles. Can not be controlled by the player.
        30: "GOODCUTOFF", // Used by script actions and triggers. Includes all party-friendly allegiances.
        31: "NOTGOOD", // Used by script actions and triggers. Includes everything except party-friendly allegiances.
        126: "ANYTHING",
        127: "AREAOBJECT", // Doors, Containers, Regions and Animations. It is included in EA groups NOTGOOD, ANYTHING, and NOTEVIL.
        128: "NEUTRAL",
        198: "NOTNEUTRAL", // Used by neutrals when targeting with enemy-only spells.
        199: "NOTEVIL", // Used by script actions and triggers. Includes everything except hostile allegiances.
        200: "EVILCUTOFF", // Used by script actions and triggers. Includes all hostile allegiances.
        201: "EVILBUTGREEN", // Hostile creatures, but uses green (friendly) selection circles.
        202: "EVILBUTBLUE", // Hostile creatures, but uses blue (neutral) selection circles.
        254: "CHARMED_PC", // This is just a separate EA from ENEMY for detection purposes. They're still valid objects for EVILCUTOFF and NearestEnemyOf(), but not by ENEMY. It's not specific to PCs.
        255: "ENEMY", // Creatures that are hostile to the party and allied creatures.
    };

    const proficiencies = {
        89: "Bastard sword",
        90: "Long sword",
        91: "Short sword",
        92: "Axe",
        93: "Two handed sword",
        94: "Katana",
        95: "Scimitar/wakizashi/ninjato",
        96: "Dagger",
        97: "Warhammer",
        98: "Spear",
        99: "Halberd",
        100: "Flail/morningstar",
        101: "Mace",
        102: "Quarterstaff",
        103: "Crossbow",
        104: "Longbow",
        105: "Shortbow",
        106: "Dart",
        107: "Sling",
        108: "Blackjack",
        111: "Two handed weapons",
        112: "Sword and shield",
        113: "Single weapon",
        114: "Two weapons style",
        115: "Club",
    };

    /* src/App.svelte generated by Svelte v3.46.2 */

    const { Object: Object_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i][0];
    	child_ctx[35] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_10(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    // (170:20) {#if isReady}
    function create_if_block_2(ctx) {
    	let div9;
    	let div2;
    	let div0;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let div1;
    	let button0;
    	let t3;
    	let button1;
    	let t4;
    	let button2;
    	let t5;
    	let div8;
    	let div7;
    	let form;
    	let div6;
    	let div5;
    	let div3;
    	let t6;
    	let t7;
    	let button3;
    	let t9;
    	let div4;
    	let input;
    	let input_max_value;
    	let t10;
    	let t11;
    	let button4;
    	let mounted;
    	let dispose;
    	let each_value_10 = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func);
    	validate_each_argument(each_value_10);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_10.length; i += 1) {
    		each_blocks_2[i] = create_each_block_10(get_each_context_10(ctx, each_value_10, i));
    	}

    	let each_value_9 = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func_1);
    	validate_each_argument(each_value_9);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_9.length; i += 1) {
    		each_blocks_1[i] = create_each_block_9(get_each_context_9(ctx, each_value_9, i));
    	}

    	let each_value = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func_2);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = space();
    			t1 = text(/*filename*/ ctx[3]);
    			t2 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t3 = space();
    			button1 = element("button");
    			t4 = space();
    			button2 = element("button");
    			t5 = space();
    			div8 = element("div");
    			div7 = element("div");
    			form = element("form");
    			div6 = element("div");
    			div5 = element("div");
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t6 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "Change Portrait";
    			t9 = space();
    			div4 = element("div");
    			input = element("input");
    			t10 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t11 = space();
    			button4 = element("button");
    			attr_dev(span, "class", "logo svelte-1k2g6qq");
    			add_location(span, file, 172, 60, 6323);
    			attr_dev(div0, "class", "title-bar-text svelte-1k2g6qq");
    			add_location(div0, file, 172, 32, 6295);
    			attr_dev(button0, "aria-label", "Minimize");
    			add_location(button0, file, 174, 36, 6468);
    			attr_dev(button1, "aria-label", "Maximize");
    			add_location(button1, file, 175, 36, 6544);
    			attr_dev(button2, "aria-label", "Close");
    			add_location(button2, file, 176, 36, 6620);
    			attr_dev(div1, "class", "title-bar-controls");
    			add_location(div1, file, 173, 32, 6399);
    			attr_dev(div2, "class", "title-bar svelte-1k2g6qq");
    			add_location(div2, file, 171, 28, 6239);
    			attr_dev(div3, "class", "field-row character-name-row svelte-1k2g6qq");
    			add_location(div3, file, 184, 44, 7157);
    			attr_dev(button3, "class", "change-portrait svelte-1k2g6qq");
    			button3.disabled = true;
    			add_location(button3, file, 192, 44, 8059);
    			attr_dev(input, "id", "character-selector");
    			attr_dev(input, "class", "has-box-indicator svelte-1k2g6qq");
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "step", "1");
    			attr_dev(input, "max", input_max_value = /*hexEditor*/ ctx[6]?.readField('partyMembersStructCount') - 1);
    			input.value = /*currentCharIdx*/ ctx[8];
    			toggle_class(input, "disabled", /*hexEditor*/ ctx[6]?.readField('partyMembersStructCount') < 2);
    			add_location(input, file, 194, 48, 8264);
    			attr_dev(div4, "class", "field-row character-selector-row svelte-1k2g6qq");
    			add_location(div4, file, 193, 44, 8169);
    			attr_dev(div5, "class", "portrait-column svelte-1k2g6qq");
    			add_location(div5, file, 183, 40, 7083);
    			attr_dev(div6, "class", "character-window svelte-1k2g6qq");
    			add_location(div6, file, 182, 36, 7012);
    			set_style(button4, "display", "none");
    			attr_dev(button4, "type", "submit");
    			add_location(button4, file, 601, 36, 54012);
    			attr_dev(form, "action", "#");
    			add_location(form, file, 181, 36, 6919);
    			attr_dev(div7, "class", "inner-window-container inner-inner-window-container svelte-1k2g6qq");
    			add_location(div7, file, 180, 32, 6817);
    			attr_dev(div8, "class", "window-body svelte-1k2g6qq");
    			add_location(div8, file, 179, 28, 6759);
    			attr_dev(div9, "class", "window inner-window svelte-1k2g6qq");
    			add_location(div9, file, 170, 24, 6177);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(div1, t4);
    			append_dev(div1, button2);
    			append_dev(div9, t5);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, form);
    			append_dev(form, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div3);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div3, null);
    			}

    			append_dev(div5, t6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div5, null);
    			}

    			append_dev(div5, t7);
    			append_dev(div5, button3);
    			append_dev(div5, t9);
    			append_dev(div5, div4);
    			append_dev(div4, input);
    			append_dev(div6, t10);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(form, t11);
    			append_dev(form, button4);
    			/*button4_binding*/ ctx[26](button4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*change_handler_1*/ ctx[21], false, false, false),
    					listen_dev(form, "submit", prevent_default(/*saveChanges*/ ctx[15]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filename*/ 8) set_data_dev(t1, /*filename*/ ctx[3]);

    			if (dirty[0] & /*hexEditor, getCharacterName, currentCharIdx*/ 8512) {
    				each_value_10 = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func);
    				validate_each_argument(each_value_10);
    				let i;

    				for (i = 0; i < each_value_10.length; i += 1) {
    					const child_ctx = get_each_context_10(ctx, each_value_10, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_10(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_10.length;
    			}

    			if (dirty[0] & /*getPcPortraitUrl, hexEditor, currentCharIdx*/ 2368) {
    				each_value_9 = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func_1);
    				validate_each_argument(each_value_9);
    				let i;

    				for (i = 0; i < each_value_9.length; i += 1) {
    					const child_ctx = get_each_context_9(ctx, each_value_9, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_9(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div5, t7);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_9.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_max_value !== (input_max_value = /*hexEditor*/ ctx[6]?.readField('partyMembersStructCount') - 1)) {
    				attr_dev(input, "max", input_max_value);
    			}

    			if (dirty[0] & /*currentCharIdx*/ 256) {
    				prop_dev(input, "value", /*currentCharIdx*/ ctx[8]);
    			}

    			if (dirty[0] & /*hexEditor*/ 64) {
    				toggle_class(input, "disabled", /*hexEditor*/ ctx[6]?.readField('partyMembersStructCount') < 2);
    			}

    			if (dirty[0] & /*currentCharIdx, hexEditor, activeTab, onTabClick*/ 4544) {
    				each_value = Array(/*hexEditor*/ ctx[6]?.readField('partyMembersStructCount')).fill(null).map(func_2);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			/*button4_binding*/ ctx[26](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(170:20) {#if isReady}",
    		ctx
    	});

    	return block;
    }

    // (186:48) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}
    function create_each_block_10(ctx) {
    	let input;
    	let input_id_value;
    	let input_name_value;
    	let input_value_value;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "id", input_id_value = `name_${/*idx*/ ctx[28]}`);
    			attr_dev(input, "name", input_name_value = `name_${/*idx*/ ctx[28]}`);
    			input.disabled = true;
    			attr_dev(input, "type", "text");
    			input.value = input_value_value = /*getCharacterName*/ ctx[13](/*idx*/ ctx[28]);
    			attr_dev(input, "class", "svelte-1k2g6qq");
    			toggle_class(input, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			add_location(input, file, 186, 52, 7398);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hexEditor*/ 64 && input_id_value !== (input_id_value = `name_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_name_value !== (input_name_value = `name_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_value_value !== (input_value_value = /*getCharacterName*/ ctx[13](/*idx*/ ctx[28])) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty[0] & /*currentCharIdx, hexEditor*/ 320) {
    				toggle_class(input, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_10.name,
    		type: "each",
    		source: "(186:48) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}",
    		ctx
    	});

    	return block;
    }

    // (190:44) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}
    function create_each_block_9(ctx) {
    	let div;
    	let div_style_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "portrait svelte-1k2g6qq");
    			attr_dev(div, "style", div_style_value = `background-image: url("${/*getPcPortraitUrl*/ ctx[11](/*idx*/ ctx[28])}");`);
    			toggle_class(div, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			add_location(div, file, 190, 48, 7835);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hexEditor*/ 64 && div_style_value !== (div_style_value = `background-image: url("${/*getPcPortraitUrl*/ ctx[11](/*idx*/ ctx[28])}");`)) {
    				attr_dev(div, "style", div_style_value);
    			}

    			if (dirty[0] & /*currentCharIdx, hexEditor*/ 320) {
    				toggle_class(div, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_9.name,
    		type: "each",
    		source: "(190:44) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}",
    		ctx
    	});

    	return block;
    }

    // (379:72) {#each Object.entries(genders) as [key, label]}
    function create_each_block_8(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 379, 76, 29803);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_8.name,
    		type: "each",
    		source: "(379:72) {#each Object.entries(genders) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (390:72) {#each Object.entries(races) as [key, label]}
    function create_each_block_7(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 390, 76, 30882);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(390:72) {#each Object.entries(races) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (401:72) {#each Object.entries(alignments) as [key, label]}
    function create_each_block_6(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 401, 76, 31993);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(401:72) {#each Object.entries(alignments) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (412:72) {#each Object.entries(classes) as [key, label]}
    function create_each_block_5(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 412, 76, 33081);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(412:72) {#each Object.entries(classes) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (424:72) {#each Object.entries(kits) as [key, label]}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 424, 76, 34245);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(424:72) {#each Object.entries(kits) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (435:72) {#each Object.entries(races) as [key, label]}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 435, 76, 35362);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(435:72) {#each Object.entries(races) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (446:72) {#each Object.entries(eas) as [key, label]}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*label*/ ctx[35] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*key*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file, 446, 76, 36467);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(446:72) {#each Object.entries(eas) as [key, label]}",
    		ctx
    	});

    	return block;
    }

    // (590:60) {#each Array(hexEditor?.getCharacterProficienciesCount(idx)).fill(null).map((_, i) => i) as pIdx}
    function create_each_block_1(ctx) {
    	let div;
    	let label;
    	let t0_value = proficiencies[/*hexEditor*/ ctx[6]?.readField('proficiencyType', /*idx*/ ctx[28], /*pIdx*/ ctx[31])] + "";
    	let t0;
    	let label_for_value;
    	let t1;
    	let input;
    	let input_id_value;
    	let input_name_value;
    	let input_value_value;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			attr_dev(label, "for", label_for_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`);
    			attr_dev(label, "class", "svelte-1k2g6qq");
    			add_location(label, file, 591, 68, 53140);
    			attr_dev(input, "id", input_id_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`);
    			attr_dev(input, "name", input_name_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`);
    			attr_dev(input, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input, "type", "text");
    			input.value = input_value_value = /*hexEditor*/ ctx[6]?.readField('weaponProficiency', /*idx*/ ctx[28], /*pIdx*/ ctx[31]);
    			add_location(input, file, 592, 68, 53332);
    			attr_dev(div, "class", "field-row svelte-1k2g6qq");
    			add_location(div, file, 590, 64, 53048);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, t0);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*hexEditor*/ 64 && t0_value !== (t0_value = proficiencies[/*hexEditor*/ ctx[6]?.readField('proficiencyType', /*idx*/ ctx[28], /*pIdx*/ ctx[31])] + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*hexEditor*/ 64 && label_for_value !== (label_for_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_id_value !== (input_id_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_name_value !== (input_name_value = `weaponProficiency-${/*pIdx*/ ctx[31]}_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input_value_value !== (input_value_value = /*hexEditor*/ ctx[6]?.readField('weaponProficiency', /*idx*/ ctx[28], /*pIdx*/ ctx[31])) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(590:60) {#each Array(hexEditor?.getCharacterProficienciesCount(idx)).fill(null).map((_, i) => i) as pIdx}",
    		ctx
    	});

    	return block;
    }

    // (203:40) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}
    function create_each_block(ctx) {
    	let div100;
    	let div4;
    	let div0;
    	let u;
    	let t1;
    	let t2;
    	let div1;
    	let t4;
    	let div2;
    	let t6;
    	let div3;
    	let t8;
    	let div99;
    	let div47;
    	let div38;
    	let div8;
    	let div5;
    	let label0;
    	let t9;
    	let label0_for_value;
    	let t10;
    	let input0;
    	let input0_id_value;
    	let input0_name_value;
    	let input0_value_value;
    	let t11;
    	let div6;
    	let label1;
    	let t12;
    	let label1_for_value;
    	let t13;
    	let input1;
    	let input1_id_value;
    	let input1_name_value;
    	let input1_value_value;
    	let t14;
    	let div7;
    	let label2;
    	let t15;
    	let label2_for_value;
    	let t16;
    	let input2;
    	let input2_id_value;
    	let input2_name_value;
    	let input2_value_value;
    	let t17;
    	let div11;
    	let div9;
    	let label3;
    	let t18;
    	let label3_for_value;
    	let t19;
    	let input3;
    	let input3_id_value;
    	let input3_name_value;
    	let input3_value_value;
    	let t20;
    	let div10;
    	let label4;
    	let t21;
    	let label4_for_value;
    	let t22;
    	let input4;
    	let input4_id_value;
    	let input4_name_value;
    	let input4_value_value;
    	let t23;
    	let div14;
    	let div12;
    	let label5;
    	let t24;
    	let label5_for_value;
    	let t25;
    	let input5;
    	let input5_id_value;
    	let input5_name_value;
    	let input5_value_value;
    	let t26;
    	let div13;
    	let label6;
    	let t27;
    	let label6_for_value;
    	let t28;
    	let input6;
    	let input6_id_value;
    	let input6_name_value;
    	let input6_value_value;
    	let t29;
    	let div15;
    	let t30;
    	let div19;
    	let div16;
    	let label7;
    	let t31;
    	let label7_for_value;
    	let t32;
    	let input7;
    	let input7_id_value;
    	let input7_name_value;
    	let input7_value_value;
    	let t33;
    	let div17;
    	let label8;
    	let t34;
    	let label8_for_value;
    	let t35;
    	let input8;
    	let input8_id_value;
    	let input8_name_value;
    	let input8_value_value;
    	let t36;
    	let div18;
    	let label9;
    	let t37;
    	let label9_for_value;
    	let t38;
    	let input9;
    	let input9_id_value;
    	let input9_name_value;
    	let input9_value_value;
    	let t39;
    	let div23;
    	let div20;
    	let label10;
    	let t40;
    	let label10_for_value;
    	let t41;
    	let input10;
    	let input10_id_value;
    	let input10_name_value;
    	let input10_value_value;
    	let t42;
    	let div21;
    	let label11;
    	let t43;
    	let label11_for_value;
    	let t44;
    	let input11;
    	let input11_id_value;
    	let input11_name_value;
    	let input11_value_value;
    	let t45;
    	let div22;
    	let label12;
    	let t46;
    	let label12_for_value;
    	let t47;
    	let input12;
    	let input12_id_value;
    	let input12_name_value;
    	let input12_value_value;
    	let t48;
    	let div27;
    	let div24;
    	let label13;
    	let t49;
    	let label13_for_value;
    	let t50;
    	let input13;
    	let input13_id_value;
    	let input13_name_value;
    	let input13_value_value;
    	let t51;
    	let div25;
    	let label14;
    	let t52;
    	let label14_for_value;
    	let t53;
    	let input14;
    	let input14_id_value;
    	let input14_name_value;
    	let input14_value_value;
    	let t54;
    	let div26;
    	let label15;
    	let t55;
    	let label15_for_value;
    	let t56;
    	let input15;
    	let input15_id_value;
    	let input15_name_value;
    	let input15_value_value;
    	let t57;
    	let div31;
    	let div28;
    	let label16;
    	let t58;
    	let label16_for_value;
    	let t59;
    	let input16;
    	let input16_id_value;
    	let input16_name_value;
    	let input16_value_value;
    	let t60;
    	let div29;
    	let label17;
    	let t61;
    	let label17_for_value;
    	let t62;
    	let input17;
    	let input17_id_value;
    	let input17_name_value;
    	let input17_value_value;
    	let t63;
    	let input18;
    	let input18_id_value;
    	let input18_name_value;
    	let input18_value_value;
    	let t64;
    	let input19;
    	let input19_id_value;
    	let input19_name_value;
    	let input19_value_value;
    	let t65;
    	let div30;
    	let label18;
    	let t66;
    	let label18_for_value;
    	let t67;
    	let input20;
    	let input20_id_value;
    	let input20_name_value;
    	let input20_value_value;
    	let t68;
    	let div35;
    	let div32;
    	let label19;
    	let t69;
    	let label19_for_value;
    	let t70;
    	let input21;
    	let input21_id_value;
    	let input21_name_value;
    	let input21_value_value;
    	let t71;
    	let div33;
    	let label20;
    	let t72;
    	let label20_for_value;
    	let t73;
    	let input22;
    	let input22_id_value;
    	let input22_name_value;
    	let input22_value_value;
    	let t74;
    	let div34;
    	let label21;
    	let t75;
    	let label21_for_value;
    	let t76;
    	let input23;
    	let input23_id_value;
    	let input23_name_value;
    	let input23_value_value;
    	let t77;
    	let div37;
    	let div36;
    	let label22;
    	let t78;
    	let label22_for_value;
    	let t79;
    	let input24;
    	let input24_id_value;
    	let input24_name_value;
    	let input24_value_value;
    	let t80;
    	let div46;
    	let fieldset0;
    	let legend0;
    	let t82;
    	let div39;
    	let label23;
    	let t83;
    	let label23_for_value;
    	let t84;
    	let input25;
    	let input25_id_value;
    	let input25_name_value;
    	let input25_value_value;
    	let t85;
    	let div40;
    	let label24;
    	let t86;
    	let label24_for_value;
    	let t87;
    	let input26;
    	let input26_id_value;
    	let input26_name_value;
    	let input26_value_value;
    	let t88;
    	let div41;
    	let label25;
    	let t89;
    	let label25_for_value;
    	let t90;
    	let input27;
    	let input27_id_value;
    	let input27_name_value;
    	let input27_value_value;
    	let t91;
    	let div42;
    	let label26;
    	let t92;
    	let label26_for_value;
    	let t93;
    	let input28;
    	let input28_id_value;
    	let input28_name_value;
    	let input28_value_value;
    	let t94;
    	let div43;
    	let label27;
    	let t95;
    	let label27_for_value;
    	let t96;
    	let input29;
    	let input29_id_value;
    	let input29_name_value;
    	let input29_value_value;
    	let t97;
    	let div44;
    	let label28;
    	let t98;
    	let label28_for_value;
    	let t99;
    	let input30;
    	let input30_id_value;
    	let input30_name_value;
    	let input30_value_value;
    	let t100;
    	let div45;
    	let label29;
    	let t101;
    	let label29_for_value;
    	let t102;
    	let input31;
    	let input31_id_value;
    	let input31_name_value;
    	let input31_value_value;
    	let t103;
    	let div72;
    	let div64;
    	let div49;
    	let div48;
    	let label30;
    	let t104;
    	let label30_for_value;
    	let t105;
    	let select0;
    	let option0;
    	let select0_id_value;
    	let select0_name_value;
    	let select0_value_value;
    	let t106;
    	let div51;
    	let div50;
    	let label31;
    	let t107;
    	let label31_for_value;
    	let t108;
    	let select1;
    	let option1;
    	let select1_id_value;
    	let select1_name_value;
    	let select1_value_value;
    	let t109;
    	let div53;
    	let div52;
    	let label32;
    	let t110;
    	let label32_for_value;
    	let t111;
    	let select2;
    	let option2;
    	let select2_id_value;
    	let select2_name_value;
    	let select2_value_value;
    	let t112;
    	let div55;
    	let div54;
    	let label33;
    	let t113;
    	let label33_for_value;
    	let t114;
    	let select3;
    	let option3;
    	let select3_id_value;
    	let select3_name_value;
    	let select3_value_value;
    	let t115;
    	let div57;
    	let div56;
    	let label34;
    	let t116;
    	let label34_for_value;
    	let t117;
    	let select4;
    	let option4;
    	let select4_id_value;
    	let select4_name_value;
    	let select4_value_value;
    	let t118;
    	let div59;
    	let div58;
    	let label35;
    	let t119;
    	let label35_for_value;
    	let t120;
    	let select5;
    	let option5;
    	let select5_id_value;
    	let select5_name_value;
    	let select5_value_value;
    	let t121;
    	let div61;
    	let div60;
    	let label36;
    	let t122;
    	let label36_for_value;
    	let t123;
    	let select6;
    	let option6;
    	let select6_id_value;
    	let select6_name_value;
    	let select6_value_value;
    	let t124;
    	let div63;
    	let div62;
    	let label37;
    	let t125;
    	let label37_for_value;
    	let t126;
    	let input32;
    	let input32_id_value;
    	let input32_name_value;
    	let t127;
    	let div71;
    	let fieldset1;
    	let legend1;
    	let t129;
    	let div65;
    	let label38;
    	let t130;
    	let label38_for_value;
    	let t131;
    	let input33;
    	let input33_id_value;
    	let input33_name_value;
    	let t132;
    	let div66;
    	let label39;
    	let t133;
    	let label39_for_value;
    	let t134;
    	let input34;
    	let input34_id_value;
    	let input34_name_value;
    	let input34_value_value;
    	let t135;
    	let div67;
    	let label40;
    	let t136;
    	let label40_for_value;
    	let t137;
    	let input35;
    	let input35_id_value;
    	let input35_name_value;
    	let input35_value_value;
    	let t138;
    	let div68;
    	let label41;
    	let t139;
    	let label41_for_value;
    	let t140;
    	let input36;
    	let input36_id_value;
    	let input36_name_value;
    	let input36_value_value;
    	let t141;
    	let div69;
    	let label42;
    	let t142;
    	let label42_for_value;
    	let t143;
    	let input37;
    	let input37_id_value;
    	let input37_name_value;
    	let input37_value_value;
    	let t144;
    	let div70;
    	let label43;
    	let t145;
    	let label43_for_value;
    	let t146;
    	let input38;
    	let input38_id_value;
    	let input38_name_value;
    	let input38_value_value;
    	let t147;
    	let div96;
    	let div84;
    	let fieldset2;
    	let legend2;
    	let t149;
    	let div73;
    	let label44;
    	let t150;
    	let label44_for_value;
    	let t151;
    	let input39;
    	let input39_id_value;
    	let input39_name_value;
    	let input39_value_value;
    	let t152;
    	let div74;
    	let label45;
    	let t153;
    	let label45_for_value;
    	let t154;
    	let input40;
    	let input40_id_value;
    	let input40_name_value;
    	let input40_value_value;
    	let t155;
    	let div75;
    	let label46;
    	let t156;
    	let label46_for_value;
    	let t157;
    	let input41;
    	let input41_id_value;
    	let input41_name_value;
    	let input41_value_value;
    	let t158;
    	let div76;
    	let label47;
    	let t159;
    	let label47_for_value;
    	let t160;
    	let input42;
    	let input42_id_value;
    	let input42_name_value;
    	let input42_value_value;
    	let t161;
    	let div77;
    	let label48;
    	let t162;
    	let label48_for_value;
    	let t163;
    	let input43;
    	let input43_id_value;
    	let input43_name_value;
    	let input43_value_value;
    	let t164;
    	let div78;
    	let label49;
    	let t165;
    	let label49_for_value;
    	let t166;
    	let input44;
    	let input44_id_value;
    	let input44_name_value;
    	let input44_value_value;
    	let t167;
    	let div79;
    	let label50;
    	let t168;
    	let label50_for_value;
    	let t169;
    	let input45;
    	let input45_id_value;
    	let input45_name_value;
    	let input45_value_value;
    	let t170;
    	let div80;
    	let label51;
    	let t171;
    	let label51_for_value;
    	let t172;
    	let input46;
    	let input46_id_value;
    	let input46_name_value;
    	let input46_value_value;
    	let t173;
    	let div81;
    	let label52;
    	let t174;
    	let label52_for_value;
    	let t175;
    	let input47;
    	let input47_id_value;
    	let input47_name_value;
    	let input47_value_value;
    	let t176;
    	let div82;
    	let label53;
    	let t177;
    	let label53_for_value;
    	let t178;
    	let input48;
    	let input48_id_value;
    	let input48_name_value;
    	let input48_value_value;
    	let t179;
    	let div83;
    	let label54;
    	let t180;
    	let label54_for_value;
    	let t181;
    	let input49;
    	let input49_id_value;
    	let input49_name_value;
    	let input49_value_value;
    	let t182;
    	let div90;
    	let fieldset3;
    	let legend3;
    	let t184;
    	let div85;
    	let label55;
    	let t185;
    	let label55_for_value;
    	let t186;
    	let input50;
    	let input50_id_value;
    	let input50_name_value;
    	let input50_value_value;
    	let t187;
    	let div86;
    	let label56;
    	let t188;
    	let label56_for_value;
    	let t189;
    	let input51;
    	let input51_id_value;
    	let input51_name_value;
    	let input51_value_value;
    	let t190;
    	let div87;
    	let label57;
    	let t191;
    	let label57_for_value;
    	let t192;
    	let input52;
    	let input52_id_value;
    	let input52_name_value;
    	let input52_value_value;
    	let t193;
    	let div88;
    	let label58;
    	let t194;
    	let label58_for_value;
    	let t195;
    	let input53;
    	let input53_id_value;
    	let input53_name_value;
    	let input53_value_value;
    	let t196;
    	let div89;
    	let label59;
    	let t197;
    	let label59_for_value;
    	let t198;
    	let input54;
    	let input54_id_value;
    	let input54_name_value;
    	let input54_value_value;
    	let t199;
    	let div95;
    	let fieldset4;
    	let legend4;
    	let t201;
    	let div91;
    	let label60;
    	let t202;
    	let label60_for_value;
    	let t203;
    	let input55;
    	let input55_id_value;
    	let input55_name_value;
    	let input55_value_value;
    	let t204;
    	let div92;
    	let label61;
    	let t205;
    	let label61_for_value;
    	let t206;
    	let input56;
    	let input56_id_value;
    	let input56_name_value;
    	let input56_value_value;
    	let t207;
    	let div93;
    	let label62;
    	let t208;
    	let label62_for_value;
    	let t209;
    	let input57;
    	let input57_id_value;
    	let input57_name_value;
    	let input57_value_value;
    	let t210;
    	let div94;
    	let label63;
    	let t211;
    	let label63_for_value;
    	let t212;
    	let input58;
    	let input58_id_value;
    	let input58_name_value;
    	let input58_value_value;
    	let t213;
    	let div98;
    	let div97;
    	let t214;
    	let mounted;
    	let dispose;
    	let each_value_8 = Object.entries(genders);
    	validate_each_argument(each_value_8);
    	let each_blocks_7 = [];

    	for (let i = 0; i < each_value_8.length; i += 1) {
    		each_blocks_7[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
    	}

    	let each_value_7 = Object.entries(races);
    	validate_each_argument(each_value_7);
    	let each_blocks_6 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_6[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	let each_value_6 = Object.entries(alignments);
    	validate_each_argument(each_value_6);
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_5[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = Object.entries(classes);
    	validate_each_argument(each_value_5);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_4[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = Object.entries(kits);
    	validate_each_argument(each_value_4);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_3[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = Object.entries(races);
    	validate_each_argument(each_value_3);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_2[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = Object.entries(eas);
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = Array(/*hexEditor*/ ctx[6]?.getCharacterProficienciesCount(/*idx*/ ctx[28])).fill(null).map(func_3);
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div100 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			u = element("u");
    			u.textContent = "A";
    			t1 = text("bilities");
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Characteristics";
    			t4 = space();
    			div2 = element("div");
    			div2.textContent = "Resistances";
    			t6 = space();
    			div3 = element("div");
    			div3.textContent = "Proficiencies";
    			t8 = space();
    			div99 = element("div");
    			div47 = element("div");
    			div38 = element("div");
    			div8 = element("div");
    			div5 = element("div");
    			label0 = element("label");
    			t9 = text("Strength");
    			t10 = space();
    			input0 = element("input");
    			t11 = space();
    			div6 = element("div");
    			label1 = element("label");
    			t12 = text("Constitution");
    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			div7 = element("div");
    			label2 = element("label");
    			t15 = text("Charisma");
    			t16 = space();
    			input2 = element("input");
    			t17 = space();
    			div11 = element("div");
    			div9 = element("div");
    			label3 = element("label");
    			t18 = text("Strength +");
    			t19 = space();
    			input3 = element("input");
    			t20 = space();
    			div10 = element("div");
    			label4 = element("label");
    			t21 = text("Intelligence");
    			t22 = space();
    			input4 = element("input");
    			t23 = space();
    			div14 = element("div");
    			div12 = element("div");
    			label5 = element("label");
    			t24 = text("Dexterity");
    			t25 = space();
    			input5 = element("input");
    			t26 = space();
    			div13 = element("div");
    			label6 = element("label");
    			t27 = text("Wisdom");
    			t28 = space();
    			input6 = element("input");
    			t29 = space();
    			div15 = element("div");
    			t30 = space();
    			div19 = element("div");
    			div16 = element("div");
    			label7 = element("label");
    			t31 = text("Base HP");
    			t32 = space();
    			input7 = element("input");
    			t33 = space();
    			div17 = element("div");
    			label8 = element("label");
    			t34 = text("Attacks");
    			t35 = space();
    			input8 = element("input");
    			t36 = space();
    			div18 = element("div");
    			label9 = element("label");
    			t37 = text("Fatigue");
    			t38 = space();
    			input9 = element("input");
    			t39 = space();
    			div23 = element("div");
    			div20 = element("div");
    			label10 = element("label");
    			t40 = text("Current HP");
    			t41 = space();
    			input10 = element("input");
    			t42 = space();
    			div21 = element("div");
    			label11 = element("label");
    			t43 = text("Experience");
    			t44 = space();
    			input11 = element("input");
    			t45 = space();
    			div22 = element("div");
    			label12 = element("label");
    			t46 = text("Intoxication");
    			t47 = space();
    			input12 = element("input");
    			t48 = space();
    			div27 = element("div");
    			div24 = element("div");
    			label13 = element("label");
    			t49 = text("Base AC");
    			t50 = space();
    			input13 = element("input");
    			t51 = space();
    			div25 = element("div");
    			label14 = element("label");
    			t52 = text("Exp for kill");
    			t53 = space();
    			input14 = element("input");
    			t54 = space();
    			div26 = element("div");
    			label15 = element("label");
    			t55 = text("Morale");
    			t56 = space();
    			input15 = element("input");
    			t57 = space();
    			div31 = element("div");
    			div28 = element("div");
    			label16 = element("label");
    			t58 = text("Effective AC");
    			t59 = space();
    			input16 = element("input");
    			t60 = space();
    			div29 = element("div");
    			label17 = element("label");
    			t61 = text("Levels");
    			t62 = space();
    			input17 = element("input");
    			t63 = space();
    			input18 = element("input");
    			t64 = space();
    			input19 = element("input");
    			t65 = space();
    			div30 = element("div");
    			label18 = element("label");
    			t66 = text("Morale Break");
    			t67 = space();
    			input20 = element("input");
    			t68 = space();
    			div35 = element("div");
    			div32 = element("div");
    			label19 = element("label");
    			t69 = text("THAC0");
    			t70 = space();
    			input21 = element("input");
    			t71 = space();
    			div33 = element("div");
    			label20 = element("label");
    			t72 = text("Gold");
    			t73 = space();
    			input22 = element("input");
    			t74 = space();
    			div34 = element("div");
    			label21 = element("label");
    			t75 = text("Morale Recovery");
    			t76 = space();
    			input23 = element("input");
    			t77 = space();
    			div37 = element("div");
    			div36 = element("div");
    			label22 = element("label");
    			t78 = text("Reputation");
    			t79 = space();
    			input24 = element("input");
    			t80 = space();
    			div46 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Thief Skills";
    			t82 = space();
    			div39 = element("div");
    			label23 = element("label");
    			t83 = text("Move Silently");
    			t84 = space();
    			input25 = element("input");
    			t85 = space();
    			div40 = element("div");
    			label24 = element("label");
    			t86 = text("Hide in Shadows");
    			t87 = space();
    			input26 = element("input");
    			t88 = space();
    			div41 = element("div");
    			label25 = element("label");
    			t89 = text("Open Locks");
    			t90 = space();
    			input27 = element("input");
    			t91 = space();
    			div42 = element("div");
    			label26 = element("label");
    			t92 = text("Pick Pockets");
    			t93 = space();
    			input28 = element("input");
    			t94 = space();
    			div43 = element("div");
    			label27 = element("label");
    			t95 = text("Find Traps");
    			t96 = space();
    			input29 = element("input");
    			t97 = space();
    			div44 = element("div");
    			label28 = element("label");
    			t98 = text("Set Traps");
    			t99 = space();
    			input30 = element("input");
    			t100 = space();
    			div45 = element("div");
    			label29 = element("label");
    			t101 = text("Detect Illusions");
    			t102 = space();
    			input31 = element("input");
    			t103 = space();
    			div72 = element("div");
    			div64 = element("div");
    			div49 = element("div");
    			div48 = element("div");
    			label30 = element("label");
    			t104 = text("Gender");
    			t105 = space();
    			select0 = element("select");
    			option0 = element("option");

    			for (let i = 0; i < each_blocks_7.length; i += 1) {
    				each_blocks_7[i].c();
    			}

    			t106 = space();
    			div51 = element("div");
    			div50 = element("div");
    			label31 = element("label");
    			t107 = text("Race");
    			t108 = space();
    			select1 = element("select");
    			option1 = element("option");

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				each_blocks_6[i].c();
    			}

    			t109 = space();
    			div53 = element("div");
    			div52 = element("div");
    			label32 = element("label");
    			t110 = text("Alignment");
    			t111 = space();
    			select2 = element("select");
    			option2 = element("option");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t112 = space();
    			div55 = element("div");
    			div54 = element("div");
    			label33 = element("label");
    			t113 = text("Class");
    			t114 = space();
    			select3 = element("select");
    			option3 = element("option");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t115 = space();
    			div57 = element("div");
    			div56 = element("div");
    			label34 = element("label");
    			t116 = text("Kit");
    			t117 = space();
    			select4 = element("select");
    			option4 = element("option");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t118 = space();
    			div59 = element("div");
    			div58 = element("div");
    			label35 = element("label");
    			t119 = text("Racial Enemy");
    			t120 = space();
    			select5 = element("select");
    			option5 = element("option");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t121 = space();
    			div61 = element("div");
    			div60 = element("div");
    			label36 = element("label");
    			t122 = text("Enemy/Ally");
    			t123 = space();
    			select6 = element("select");
    			option6 = element("option");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t124 = space();
    			div63 = element("div");
    			div62 = element("div");
    			label37 = element("label");
    			t125 = text("Movement Speed");
    			t126 = space();
    			input32 = element("input");
    			t127 = space();
    			div71 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Kill Stats";
    			t129 = space();
    			div65 = element("div");
    			label38 = element("label");
    			t130 = text("Strongest Kill");
    			t131 = space();
    			input33 = element("input");
    			t132 = space();
    			div66 = element("div");
    			label39 = element("label");
    			t133 = text("Strongest Kill XP");
    			t134 = space();
    			input34 = element("input");
    			t135 = space();
    			div67 = element("div");
    			label40 = element("label");
    			t136 = text("Chapter Kills");
    			t137 = space();
    			input35 = element("input");
    			t138 = space();
    			div68 = element("div");
    			label41 = element("label");
    			t139 = text("Chapter Kills XP");
    			t140 = space();
    			input36 = element("input");
    			t141 = space();
    			div69 = element("div");
    			label42 = element("label");
    			t142 = text("Game Kills");
    			t143 = space();
    			input37 = element("input");
    			t144 = space();
    			div70 = element("div");
    			label43 = element("label");
    			t145 = text("Game Kills XP");
    			t146 = space();
    			input38 = element("input");
    			t147 = space();
    			div96 = element("div");
    			div84 = element("div");
    			fieldset2 = element("fieldset");
    			legend2 = element("legend");
    			legend2.textContent = "Resistances";
    			t149 = space();
    			div73 = element("div");
    			label44 = element("label");
    			t150 = text("Acid");
    			t151 = space();
    			input39 = element("input");
    			t152 = space();
    			div74 = element("div");
    			label45 = element("label");
    			t153 = text("Slashing");
    			t154 = space();
    			input40 = element("input");
    			t155 = space();
    			div75 = element("div");
    			label46 = element("label");
    			t156 = text("Cold");
    			t157 = space();
    			input41 = element("input");
    			t158 = space();
    			div76 = element("div");
    			label47 = element("label");
    			t159 = text("Missile");
    			t160 = space();
    			input42 = element("input");
    			t161 = space();
    			div77 = element("div");
    			label48 = element("label");
    			t162 = text("Electricity");
    			t163 = space();
    			input43 = element("input");
    			t164 = space();
    			div78 = element("div");
    			label49 = element("label");
    			t165 = text("Magic");
    			t166 = space();
    			input44 = element("input");
    			t167 = space();
    			div79 = element("div");
    			label50 = element("label");
    			t168 = text("Fire");
    			t169 = space();
    			input45 = element("input");
    			t170 = space();
    			div80 = element("div");
    			label51 = element("label");
    			t171 = text("Magic Fire");
    			t172 = space();
    			input46 = element("input");
    			t173 = space();
    			div81 = element("div");
    			label52 = element("label");
    			t174 = text("Crushing");
    			t175 = space();
    			input47 = element("input");
    			t176 = space();
    			div82 = element("div");
    			label53 = element("label");
    			t177 = text("Magic Cold");
    			t178 = space();
    			input48 = element("input");
    			t179 = space();
    			div83 = element("div");
    			label54 = element("label");
    			t180 = text("Piercing");
    			t181 = space();
    			input49 = element("input");
    			t182 = space();
    			div90 = element("div");
    			fieldset3 = element("fieldset");
    			legend3 = element("legend");
    			legend3.textContent = "Saving Throws";
    			t184 = space();
    			div85 = element("div");
    			label55 = element("label");
    			t185 = text("Paralyzation, Poison, Death");
    			t186 = space();
    			input50 = element("input");
    			t187 = space();
    			div86 = element("div");
    			label56 = element("label");
    			t188 = text("Rod, Staff, Wand");
    			t189 = space();
    			input51 = element("input");
    			t190 = space();
    			div87 = element("div");
    			label57 = element("label");
    			t191 = text("Petrification, Polymorph");
    			t192 = space();
    			input52 = element("input");
    			t193 = space();
    			div88 = element("div");
    			label58 = element("label");
    			t194 = text("Breath Weapons");
    			t195 = space();
    			input53 = element("input");
    			t196 = space();
    			div89 = element("div");
    			label59 = element("label");
    			t197 = text("Spells");
    			t198 = space();
    			input54 = element("input");
    			t199 = space();
    			div95 = element("div");
    			fieldset4 = element("fieldset");
    			legend4 = element("legend");
    			legend4.textContent = "Armour Class Modifiers";
    			t201 = space();
    			div91 = element("div");
    			label60 = element("label");
    			t202 = text("Slashing");
    			t203 = space();
    			input55 = element("input");
    			t204 = space();
    			div92 = element("div");
    			label61 = element("label");
    			t205 = text("Missile");
    			t206 = space();
    			input56 = element("input");
    			t207 = space();
    			div93 = element("div");
    			label62 = element("label");
    			t208 = text("Crushing");
    			t209 = space();
    			input57 = element("input");
    			t210 = space();
    			div94 = element("div");
    			label63 = element("label");
    			t211 = text("Piercing");
    			t212 = space();
    			input58 = element("input");
    			t213 = space();
    			div98 = element("div");
    			div97 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t214 = space();
    			add_location(u, file, 205, 131, 9361);
    			attr_dev(div0, "class", "tab svelte-1k2g6qq");
    			toggle_class(div0, "active", /*activeTab*/ ctx[7] === 0);
    			add_location(div0, file, 205, 52, 9282);
    			attr_dev(div1, "class", "tab svelte-1k2g6qq");
    			toggle_class(div1, "active", /*activeTab*/ ctx[7] === 1);
    			add_location(div1, file, 206, 52, 9436);
    			attr_dev(div2, "class", "tab svelte-1k2g6qq");
    			toggle_class(div2, "active", /*activeTab*/ ctx[7] === 2);
    			add_location(div2, file, 207, 52, 9589);
    			attr_dev(div3, "class", "tab svelte-1k2g6qq");
    			toggle_class(div3, "active", /*activeTab*/ ctx[7] === 3);
    			add_location(div3, file, 208, 52, 9738);
    			attr_dev(div4, "class", "tabs svelte-1k2g6qq");
    			add_location(div4, file, 204, 48, 9211);
    			attr_dev(label0, "for", label0_for_value = `strength_${/*idx*/ ctx[28]}`);
    			attr_dev(label0, "class", "svelte-1k2g6qq");
    			add_location(label0, file, 215, 68, 10407);
    			attr_dev(input0, "id", input0_id_value = `strength_${/*idx*/ ctx[28]}`);
    			attr_dev(input0, "name", input0_name_value = `strength_${/*idx*/ ctx[28]}`);
    			attr_dev(input0, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input0, "type", "text");
    			input0.value = input0_value_value = /*hexEditor*/ ctx[6]?.readField('strength', /*idx*/ ctx[28]);
    			add_location(input0, file, 216, 68, 10523);
    			attr_dev(div5, "class", "field-row svelte-1k2g6qq");
    			add_location(div5, file, 214, 64, 10315);
    			attr_dev(label1, "for", label1_for_value = `constitution_${/*idx*/ ctx[28]}`);
    			attr_dev(label1, "class", "svelte-1k2g6qq");
    			add_location(label1, file, 219, 68, 10887);
    			attr_dev(input1, "id", input1_id_value = `constitution_${/*idx*/ ctx[28]}`);
    			attr_dev(input1, "name", input1_name_value = `constitution_${/*idx*/ ctx[28]}`);
    			attr_dev(input1, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input1, "type", "text");
    			input1.value = input1_value_value = /*hexEditor*/ ctx[6]?.readField('constitution', /*idx*/ ctx[28]);
    			add_location(input1, file, 220, 68, 11011);
    			attr_dev(div6, "class", "field-row svelte-1k2g6qq");
    			add_location(div6, file, 218, 64, 10795);
    			attr_dev(label2, "for", label2_for_value = `charisma_${/*idx*/ ctx[28]}`);
    			attr_dev(label2, "class", "svelte-1k2g6qq");
    			add_location(label2, file, 223, 68, 11387);
    			attr_dev(input2, "id", input2_id_value = `charisma_${/*idx*/ ctx[28]}`);
    			attr_dev(input2, "name", input2_name_value = `charisma_${/*idx*/ ctx[28]}`);
    			attr_dev(input2, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input2, "type", "text");
    			input2.value = input2_value_value = /*hexEditor*/ ctx[6]?.readField('charisma', /*idx*/ ctx[28]);
    			add_location(input2, file, 224, 68, 11503);
    			attr_dev(div7, "class", "field-row svelte-1k2g6qq");
    			add_location(div7, file, 222, 64, 11295);
    			attr_dev(div8, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div8, file, 213, 60, 10223);
    			attr_dev(label3, "for", label3_for_value = `strengthBonus_${/*idx*/ ctx[28]}`);
    			attr_dev(label3, "class", "svelte-1k2g6qq");
    			add_location(label3, file, 229, 68, 12022);
    			attr_dev(input3, "id", input3_id_value = `strengthBonus_${/*idx*/ ctx[28]}`);
    			attr_dev(input3, "name", input3_name_value = `strengthBonus_${/*idx*/ ctx[28]}`);
    			attr_dev(input3, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input3, "type", "text");
    			input3.value = input3_value_value = /*hexEditor*/ ctx[6]?.readField('strengthBonus', /*idx*/ ctx[28]);
    			add_location(input3, file, 230, 68, 12145);
    			attr_dev(div9, "class", "field-row svelte-1k2g6qq");
    			add_location(div9, file, 228, 64, 11930);
    			attr_dev(label4, "for", label4_for_value = `intelligence_${/*idx*/ ctx[28]}`);
    			attr_dev(label4, "class", "svelte-1k2g6qq");
    			add_location(label4, file, 233, 68, 12524);
    			attr_dev(input4, "id", input4_id_value = `intelligence_${/*idx*/ ctx[28]}`);
    			attr_dev(input4, "name", input4_name_value = `intelligence_${/*idx*/ ctx[28]}`);
    			attr_dev(input4, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input4, "type", "text");
    			input4.value = input4_value_value = /*hexEditor*/ ctx[6]?.readField('intelligence', /*idx*/ ctx[28]);
    			add_location(input4, file, 234, 68, 12648);
    			attr_dev(div10, "class", "field-row svelte-1k2g6qq");
    			add_location(div10, file, 232, 64, 12432);
    			attr_dev(div11, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div11, file, 227, 60, 11838);
    			attr_dev(label5, "for", label5_for_value = `dexterity_${/*idx*/ ctx[28]}`);
    			attr_dev(label5, "class", "svelte-1k2g6qq");
    			add_location(label5, file, 239, 68, 13179);
    			attr_dev(input5, "id", input5_id_value = `dexterity_${/*idx*/ ctx[28]}`);
    			attr_dev(input5, "name", input5_name_value = `dexterity_${/*idx*/ ctx[28]}`);
    			attr_dev(input5, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input5, "type", "text");
    			input5.value = input5_value_value = /*hexEditor*/ ctx[6]?.readField('dexterity', /*idx*/ ctx[28]);
    			add_location(input5, file, 240, 68, 13297);
    			attr_dev(div12, "class", "field-row svelte-1k2g6qq");
    			add_location(div12, file, 238, 64, 13087);
    			attr_dev(label6, "for", label6_for_value = `wisdom_${/*idx*/ ctx[28]}`);
    			attr_dev(label6, "class", "svelte-1k2g6qq");
    			add_location(label6, file, 243, 68, 13664);
    			attr_dev(input6, "id", input6_id_value = `wisdom_${/*idx*/ ctx[28]}`);
    			attr_dev(input6, "name", input6_name_value = `wisdom_${/*idx*/ ctx[28]}`);
    			attr_dev(input6, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input6, "type", "text");
    			input6.value = input6_value_value = /*hexEditor*/ ctx[6]?.readField('wisdom', /*idx*/ ctx[28]);
    			add_location(input6, file, 244, 68, 13776);
    			attr_dev(div13, "class", "field-row svelte-1k2g6qq");
    			add_location(div13, file, 242, 64, 13572);
    			attr_dev(div14, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div14, file, 237, 60, 12995);
    			attr_dev(div15, "class", "abilities-row-separator svelte-1k2g6qq");
    			add_location(div15, file, 247, 60, 14105);
    			attr_dev(label7, "for", label7_for_value = `maxHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(label7, "class", "svelte-1k2g6qq");
    			add_location(label7, file, 250, 68, 14393);
    			attr_dev(input7, "id", input7_id_value = `maxHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input7, "name", input7_name_value = `maxHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input7, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input7, "type", "text");
    			input7.value = input7_value_value = /*hexEditor*/ ctx[6]?.readField('maxHitPoints', /*idx*/ ctx[28]);
    			add_location(input7, file, 251, 68, 14512);
    			attr_dev(div16, "class", "field-row svelte-1k2g6qq");
    			add_location(div16, file, 249, 64, 14301);
    			attr_dev(label8, "for", label8_for_value = `attacksPerRound_${/*idx*/ ctx[28]}`);
    			attr_dev(label8, "class", "svelte-1k2g6qq");
    			add_location(label8, file, 254, 68, 14888);
    			attr_dev(input8, "id", input8_id_value = `attacksPerRound_${/*idx*/ ctx[28]}`);
    			attr_dev(input8, "name", input8_name_value = `attacksPerRound_${/*idx*/ ctx[28]}`);
    			attr_dev(input8, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input8, "type", "text");
    			input8.value = input8_value_value = /*hexEditor*/ ctx[6]?.readField('attacksPerRound', /*idx*/ ctx[28]);
    			add_location(input8, file, 255, 68, 15010);
    			attr_dev(div17, "class", "field-row svelte-1k2g6qq");
    			add_location(div17, file, 253, 64, 14796);
    			attr_dev(label9, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label9, "for", label9_for_value = `fatigue_${/*idx*/ ctx[28]}`);
    			add_location(label9, file, 258, 68, 15394);
    			attr_dev(input9, "id", input9_id_value = `fatigue_${/*idx*/ ctx[28]}`);
    			attr_dev(input9, "name", input9_name_value = `fatigue_${/*idx*/ ctx[28]}`);
    			attr_dev(input9, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input9, "type", "text");
    			input9.value = input9_value_value = /*hexEditor*/ ctx[6]?.readField('fatigue', /*idx*/ ctx[28]);
    			add_location(input9, file, 259, 68, 15527);
    			attr_dev(div18, "class", "field-row svelte-1k2g6qq");
    			add_location(div18, file, 257, 64, 15302);
    			attr_dev(div19, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div19, file, 248, 60, 14209);
    			attr_dev(label10, "for", label10_for_value = `currentHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(label10, "class", "svelte-1k2g6qq");
    			add_location(label10, file, 264, 68, 16043);
    			attr_dev(input10, "id", input10_id_value = `currentHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input10, "name", input10_name_value = `currentHitPoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input10, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input10, "type", "text");
    			input10.value = input10_value_value = /*hexEditor*/ ctx[6]?.readField('currentHitPoints', /*idx*/ ctx[28]);
    			add_location(input10, file, 265, 68, 16169);
    			attr_dev(div20, "class", "field-row svelte-1k2g6qq");
    			add_location(div20, file, 263, 64, 15951);
    			attr_dev(label11, "for", label11_for_value = `experiencePoints_${/*idx*/ ctx[28]}`);
    			attr_dev(label11, "class", "svelte-1k2g6qq");
    			add_location(label11, file, 268, 68, 16557);
    			attr_dev(input11, "id", input11_id_value = `experiencePoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input11, "name", input11_name_value = `experiencePoints_${/*idx*/ ctx[28]}`);
    			attr_dev(input11, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input11, "type", "text");
    			input11.value = input11_value_value = /*hexEditor*/ ctx[6]?.readField('experiencePoints', /*idx*/ ctx[28]);
    			add_location(input11, file, 269, 68, 16683);
    			attr_dev(div21, "class", "field-row svelte-1k2g6qq");
    			add_location(div21, file, 267, 64, 16465);
    			attr_dev(label12, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label12, "for", label12_for_value = `intoxication_${/*idx*/ ctx[28]}`);
    			add_location(label12, file, 272, 68, 17070);
    			attr_dev(input12, "id", input12_id_value = `intoxication_${/*idx*/ ctx[28]}`);
    			attr_dev(input12, "name", input12_name_value = `intoxication_${/*idx*/ ctx[28]}`);
    			attr_dev(input12, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input12, "type", "text");
    			input12.value = input12_value_value = /*hexEditor*/ ctx[6]?.readField('intoxication', /*idx*/ ctx[28]);
    			add_location(input12, file, 273, 68, 17213);
    			attr_dev(div22, "class", "field-row svelte-1k2g6qq");
    			add_location(div22, file, 271, 64, 16978);
    			attr_dev(div23, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div23, file, 262, 60, 15859);
    			attr_dev(label13, "for", label13_for_value = `acNatural_${/*idx*/ ctx[28]}`);
    			attr_dev(label13, "class", "svelte-1k2g6qq");
    			add_location(label13, file, 278, 68, 17744);
    			attr_dev(input13, "id", input13_id_value = `acNatural_${/*idx*/ ctx[28]}`);
    			attr_dev(input13, "name", input13_name_value = `acNatural_${/*idx*/ ctx[28]}`);
    			attr_dev(input13, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input13, "type", "text");
    			input13.value = input13_value_value = /*hexEditor*/ ctx[6]?.readField('acNatural', /*idx*/ ctx[28]);
    			add_location(input13, file, 279, 68, 17860);
    			attr_dev(div24, "class", "field-row svelte-1k2g6qq");
    			add_location(div24, file, 277, 64, 17652);
    			attr_dev(label14, "for", label14_for_value = `experienceForKill_${/*idx*/ ctx[28]}`);
    			attr_dev(label14, "class", "svelte-1k2g6qq");
    			add_location(label14, file, 282, 68, 18227);
    			attr_dev(input14, "id", input14_id_value = `experienceForKill_${/*idx*/ ctx[28]}`);
    			attr_dev(input14, "name", input14_name_value = `experienceForKill_${/*idx*/ ctx[28]}`);
    			attr_dev(input14, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input14, "type", "text");
    			input14.value = input14_value_value = /*hexEditor*/ ctx[6]?.readField('experienceForKill', /*idx*/ ctx[28]);
    			add_location(input14, file, 283, 68, 18356);
    			attr_dev(div25, "class", "field-row svelte-1k2g6qq");
    			add_location(div25, file, 281, 64, 18135);
    			attr_dev(label15, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label15, "for", label15_for_value = `morale_${/*idx*/ ctx[28]}`);
    			add_location(label15, file, 286, 68, 18746);
    			attr_dev(input15, "id", input15_id_value = `morale_${/*idx*/ ctx[28]}`);
    			attr_dev(input15, "name", input15_name_value = `morale_${/*idx*/ ctx[28]}`);
    			attr_dev(input15, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input15, "type", "text");
    			input15.value = input15_value_value = /*hexEditor*/ ctx[6]?.readField('morale', /*idx*/ ctx[28]);
    			add_location(input15, file, 287, 68, 18877);
    			attr_dev(div26, "class", "field-row svelte-1k2g6qq");
    			add_location(div26, file, 285, 64, 18654);
    			attr_dev(div27, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div27, file, 276, 60, 17560);
    			attr_dev(label16, "for", label16_for_value = `acEffective_${/*idx*/ ctx[28]}`);
    			attr_dev(label16, "class", "svelte-1k2g6qq");
    			add_location(label16, file, 292, 68, 19390);
    			attr_dev(input16, "id", input16_id_value = `acEffective_${/*idx*/ ctx[28]}`);
    			attr_dev(input16, "name", input16_name_value = `acEffective_${/*idx*/ ctx[28]}`);
    			attr_dev(input16, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input16, "type", "text");
    			input16.value = input16_value_value = /*hexEditor*/ ctx[6]?.readField('acEffective', /*idx*/ ctx[28]);
    			add_location(input16, file, 293, 68, 19513);
    			attr_dev(div28, "class", "field-row svelte-1k2g6qq");
    			add_location(div28, file, 291, 64, 19298);
    			attr_dev(label17, "for", label17_for_value = `level1_${/*idx*/ ctx[28]}`);
    			attr_dev(label17, "class", "svelte-1k2g6qq");
    			add_location(label17, file, 296, 68, 19886);
    			attr_dev(input17, "id", input17_id_value = `level1_${/*idx*/ ctx[28]}`);
    			attr_dev(input17, "name", input17_name_value = `level1_${/*idx*/ ctx[28]}`);
    			attr_dev(input17, "class", "shorter-input svelte-1k2g6qq");
    			attr_dev(input17, "type", "text");
    			input17.value = input17_value_value = /*hexEditor*/ ctx[6]?.readField('level1', /*idx*/ ctx[28]);
    			add_location(input17, file, 297, 68, 19998);
    			attr_dev(input18, "id", input18_id_value = `level2_${/*idx*/ ctx[28]}`);
    			attr_dev(input18, "name", input18_name_value = `level2_${/*idx*/ ctx[28]}`);
    			attr_dev(input18, "class", "shorter-input svelte-1k2g6qq");
    			attr_dev(input18, "type", "text");
    			input18.value = input18_value_value = /*hexEditor*/ ctx[6]?.readField('level2', /*idx*/ ctx[28]);
    			add_location(input18, file, 298, 68, 20199);
    			attr_dev(input19, "id", input19_id_value = `level3_${/*idx*/ ctx[28]}`);
    			attr_dev(input19, "name", input19_name_value = `level3_${/*idx*/ ctx[28]}`);
    			attr_dev(input19, "class", "shorter-input svelte-1k2g6qq");
    			attr_dev(input19, "type", "text");
    			input19.value = input19_value_value = /*hexEditor*/ ctx[6]?.readField('level3', /*idx*/ ctx[28]);
    			add_location(input19, file, 299, 68, 20400);
    			attr_dev(div29, "class", "field-row svelte-1k2g6qq");
    			add_location(div29, file, 295, 64, 19794);
    			attr_dev(label18, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label18, "for", label18_for_value = `moraleBreak_${/*idx*/ ctx[28]}`);
    			add_location(label18, file, 302, 68, 20760);
    			attr_dev(input20, "id", input20_id_value = `moraleBreak_${/*idx*/ ctx[28]}`);
    			attr_dev(input20, "name", input20_name_value = `moraleBreak_${/*idx*/ ctx[28]}`);
    			attr_dev(input20, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input20, "type", "text");
    			input20.value = input20_value_value = /*hexEditor*/ ctx[6]?.readField('moraleBreak', /*idx*/ ctx[28]);
    			add_location(input20, file, 303, 68, 20902);
    			attr_dev(div30, "class", "field-row svelte-1k2g6qq");
    			add_location(div30, file, 301, 64, 20668);
    			attr_dev(div31, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div31, file, 290, 60, 19206);
    			attr_dev(label19, "for", label19_for_value = `thac0_${/*idx*/ ctx[28]}`);
    			attr_dev(label19, "class", "svelte-1k2g6qq");
    			add_location(label19, file, 308, 68, 21430);
    			attr_dev(input21, "id", input21_id_value = `thac0_${/*idx*/ ctx[28]}`);
    			attr_dev(input21, "name", input21_name_value = `thac0_${/*idx*/ ctx[28]}`);
    			attr_dev(input21, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input21, "type", "text");
    			input21.value = input21_value_value = /*hexEditor*/ ctx[6]?.readField('thac0', /*idx*/ ctx[28]);
    			add_location(input21, file, 309, 68, 21540);
    			attr_dev(div32, "class", "field-row svelte-1k2g6qq");
    			add_location(div32, file, 307, 64, 21338);
    			attr_dev(label20, "for", label20_for_value = `partyGold_${/*idx*/ ctx[28]}`);
    			attr_dev(label20, "class", "svelte-1k2g6qq");
    			add_location(label20, file, 316, 68, 22414);
    			attr_dev(input22, "id", input22_id_value = `partyGold_${/*idx*/ ctx[28]}`);
    			attr_dev(input22, "name", input22_name_value = `partyGold_${/*idx*/ ctx[28]}`);
    			attr_dev(input22, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input22, "type", "text");
    			input22.value = input22_value_value = /*hexEditor*/ ctx[6]?.readField('partyGold');
    			add_location(input22, file, 317, 68, 22527);
    			attr_dev(div33, "class", "field-row svelte-1k2g6qq");
    			add_location(div33, file, 315, 64, 22322);
    			attr_dev(label21, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label21, "for", label21_for_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`);
    			add_location(label21, file, 320, 68, 22889);
    			attr_dev(input23, "id", input23_id_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`);
    			attr_dev(input23, "name", input23_name_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`);
    			attr_dev(input23, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input23, "type", "text");
    			input23.value = input23_value_value = /*hexEditor*/ ctx[6]?.readField('moraleRecoveryTime', /*idx*/ ctx[28]);
    			add_location(input23, file, 321, 68, 23041);
    			attr_dev(div34, "class", "field-row svelte-1k2g6qq");
    			add_location(div34, file, 319, 64, 22797);
    			attr_dev(div35, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div35, file, 306, 60, 21246);
    			attr_dev(label22, "for", label22_for_value = `partyReputation_${/*idx*/ ctx[28]}`);
    			attr_dev(label22, "class", "svelte-1k2g6qq");
    			add_location(label22, file, 332, 68, 24278);
    			attr_dev(input24, "id", input24_id_value = `partyReputation_${/*idx*/ ctx[28]}`);
    			attr_dev(input24, "name", input24_name_value = `partyReputation_${/*idx*/ ctx[28]}`);
    			attr_dev(input24, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input24, "type", "text");
    			input24.value = input24_value_value = /*hexEditor*/ ctx[6]?.readField('partyReputation');
    			add_location(input24, file, 333, 68, 24403);
    			attr_dev(div36, "class", "field-row svelte-1k2g6qq");
    			add_location(div36, file, 331, 64, 24186);
    			attr_dev(div37, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div37, file, 330, 60, 24094);
    			attr_dev(div38, "class", "abilities-column svelte-1k2g6qq");
    			add_location(div38, file, 212, 56, 10132);
    			add_location(legend0, file, 339, 64, 24978);
    			attr_dev(label23, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label23, "for", label23_for_value = `moveSilently_${/*idx*/ ctx[28]}`);
    			add_location(label23, file, 341, 68, 25164);
    			attr_dev(input25, "id", input25_id_value = `moveSilently_${/*idx*/ ctx[28]}`);
    			attr_dev(input25, "name", input25_name_value = `moveSilently_${/*idx*/ ctx[28]}`);
    			attr_dev(input25, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input25, "type", "text");
    			input25.value = input25_value_value = /*hexEditor*/ ctx[6]?.readField('moveSilently', /*idx*/ ctx[28]);
    			add_location(input25, file, 342, 68, 25308);
    			attr_dev(div39, "class", "field-row svelte-1k2g6qq");
    			add_location(div39, file, 340, 64, 25072);
    			attr_dev(label24, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label24, "for", label24_for_value = `hideInShadows_${/*idx*/ ctx[28]}`);
    			add_location(label24, file, 345, 68, 25685);
    			attr_dev(input26, "id", input26_id_value = `hideInShadows_${/*idx*/ ctx[28]}`);
    			attr_dev(input26, "name", input26_name_value = `hideInShadows_${/*idx*/ ctx[28]}`);
    			attr_dev(input26, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input26, "type", "text");
    			input26.value = input26_value_value = /*hexEditor*/ ctx[6]?.readField('hideInShadows', /*idx*/ ctx[28]);
    			add_location(input26, file, 346, 68, 25832);
    			attr_dev(div40, "class", "field-row svelte-1k2g6qq");
    			add_location(div40, file, 344, 64, 25593);
    			attr_dev(label25, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label25, "for", label25_for_value = `lockpicking_${/*idx*/ ctx[28]}`);
    			add_location(label25, file, 349, 68, 26212);
    			attr_dev(input27, "id", input27_id_value = `lockpicking_${/*idx*/ ctx[28]}`);
    			attr_dev(input27, "name", input27_name_value = `lockpicking_${/*idx*/ ctx[28]}`);
    			attr_dev(input27, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input27, "type", "text");
    			input27.value = input27_value_value = /*hexEditor*/ ctx[6]?.readField('lockpicking', /*idx*/ ctx[28]);
    			add_location(input27, file, 350, 68, 26352);
    			attr_dev(div41, "class", "field-row svelte-1k2g6qq");
    			add_location(div41, file, 348, 64, 26120);
    			attr_dev(label26, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label26, "for", label26_for_value = `pickPockets_${/*idx*/ ctx[28]}`);
    			add_location(label26, file, 353, 68, 26726);
    			attr_dev(input28, "id", input28_id_value = `pickPockets_${/*idx*/ ctx[28]}`);
    			attr_dev(input28, "name", input28_name_value = `pickPockets_${/*idx*/ ctx[28]}`);
    			attr_dev(input28, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input28, "type", "text");
    			input28.value = input28_value_value = /*hexEditor*/ ctx[6]?.readField('pickPockets', /*idx*/ ctx[28]);
    			add_location(input28, file, 354, 68, 26868);
    			attr_dev(div42, "class", "field-row svelte-1k2g6qq");
    			add_location(div42, file, 352, 64, 26634);
    			attr_dev(label27, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label27, "for", label27_for_value = `findDisarmTraps_${/*idx*/ ctx[28]}`);
    			add_location(label27, file, 357, 68, 27242);
    			attr_dev(input29, "id", input29_id_value = `findDisarmTraps_${/*idx*/ ctx[28]}`);
    			attr_dev(input29, "name", input29_name_value = `findDisarmTraps_${/*idx*/ ctx[28]}`);
    			attr_dev(input29, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input29, "type", "text");
    			input29.value = input29_value_value = /*hexEditor*/ ctx[6]?.readField('findDisarmTraps', /*idx*/ ctx[28]);
    			add_location(input29, file, 358, 68, 27386);
    			attr_dev(div43, "class", "field-row svelte-1k2g6qq");
    			add_location(div43, file, 356, 64, 27150);
    			attr_dev(label28, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label28, "for", label28_for_value = `setTraps_${/*idx*/ ctx[28]}`);
    			add_location(label28, file, 361, 68, 27772);
    			attr_dev(input30, "id", input30_id_value = `setTraps_${/*idx*/ ctx[28]}`);
    			attr_dev(input30, "name", input30_name_value = `setTraps_${/*idx*/ ctx[28]}`);
    			attr_dev(input30, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input30, "type", "text");
    			input30.value = input30_value_value = /*hexEditor*/ ctx[6]?.readField('setTraps', /*idx*/ ctx[28]);
    			add_location(input30, file, 362, 68, 27908);
    			attr_dev(div44, "class", "field-row svelte-1k2g6qq");
    			add_location(div44, file, 360, 64, 27680);
    			attr_dev(label29, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label29, "for", label29_for_value = `detectIllusion_${/*idx*/ ctx[28]}`);
    			add_location(label29, file, 365, 68, 28273);
    			attr_dev(input31, "id", input31_id_value = `detectIllusion_${/*idx*/ ctx[28]}`);
    			attr_dev(input31, "name", input31_name_value = `detectIllusion_${/*idx*/ ctx[28]}`);
    			attr_dev(input31, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input31, "type", "text");
    			input31.value = input31_value_value = /*hexEditor*/ ctx[6]?.readField('detectIllusion', /*idx*/ ctx[28]);
    			add_location(input31, file, 366, 68, 28422);
    			attr_dev(div45, "class", "field-row svelte-1k2g6qq");
    			add_location(div45, file, 364, 64, 28181);
    			add_location(fieldset0, file, 338, 60, 24903);
    			attr_dev(div46, "class", "thieves-column svelte-1k2g6qq");
    			add_location(div46, file, 337, 56, 24814);
    			attr_dev(div47, "class", "tab-content svelte-1k2g6qq");
    			toggle_class(div47, "active", /*activeTab*/ ctx[7] === 0);
    			add_location(div47, file, 211, 52, 10019);
    			attr_dev(label30, "for", label30_for_value = `gender_${/*idx*/ ctx[28]}`);
    			attr_dev(label30, "class", "svelte-1k2g6qq");
    			add_location(label30, file, 375, 68, 29289);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file, 377, 72, 29580);
    			attr_dev(select0, "id", select0_id_value = `gender_${/*idx*/ ctx[28]}`);
    			attr_dev(select0, "name", select0_name_value = `gender_${/*idx*/ ctx[28]}`);
    			attr_dev(select0, "class", "svelte-1k2g6qq");
    			add_location(select0, file, 376, 68, 29401);
    			attr_dev(div48, "class", "field-row svelte-1k2g6qq");
    			add_location(div48, file, 374, 64, 29197);
    			attr_dev(div49, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div49, file, 373, 60, 29105);
    			attr_dev(label31, "for", label31_for_value = `race_${/*idx*/ ctx[28]}`);
    			attr_dev(label31, "class", "svelte-1k2g6qq");
    			add_location(label31, file, 386, 68, 30380);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file, 388, 72, 30661);
    			attr_dev(select1, "id", select1_id_value = `race_${/*idx*/ ctx[28]}`);
    			attr_dev(select1, "name", select1_name_value = `race_${/*idx*/ ctx[28]}`);
    			attr_dev(select1, "class", "svelte-1k2g6qq");
    			add_location(select1, file, 387, 68, 30488);
    			attr_dev(div50, "class", "field-row svelte-1k2g6qq");
    			add_location(div50, file, 385, 64, 30288);
    			attr_dev(div51, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div51, file, 384, 60, 30196);
    			attr_dev(label32, "for", label32_for_value = `alignment_${/*idx*/ ctx[28]}`);
    			attr_dev(label32, "class", "svelte-1k2g6qq");
    			add_location(label32, file, 397, 68, 31461);
    			option2.__value = "";
    			option2.value = option2.__value;
    			add_location(option2, file, 399, 72, 31767);
    			attr_dev(select2, "id", select2_id_value = `alignment_${/*idx*/ ctx[28]}`);
    			attr_dev(select2, "name", select2_name_value = `alignment_${/*idx*/ ctx[28]}`);
    			attr_dev(select2, "class", "svelte-1k2g6qq");
    			add_location(select2, file, 398, 68, 31579);
    			attr_dev(div52, "class", "field-row svelte-1k2g6qq");
    			add_location(div52, file, 396, 64, 31369);
    			attr_dev(div53, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div53, file, 395, 60, 31277);
    			attr_dev(label33, "for", label33_for_value = `class_${/*idx*/ ctx[28]}`);
    			attr_dev(label33, "class", "svelte-1k2g6qq");
    			add_location(label33, file, 408, 68, 32572);
    			option3.__value = "";
    			option3.value = option3.__value;
    			add_location(option3, file, 410, 72, 32858);
    			attr_dev(select3, "id", select3_id_value = `class_${/*idx*/ ctx[28]}`);
    			attr_dev(select3, "name", select3_name_value = `class_${/*idx*/ ctx[28]}`);
    			attr_dev(select3, "class", "svelte-1k2g6qq");
    			add_location(select3, file, 409, 68, 32682);
    			attr_dev(div54, "class", "field-row svelte-1k2g6qq");
    			add_location(div54, file, 407, 64, 32480);
    			attr_dev(div55, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div55, file, 406, 60, 32388);
    			attr_dev(label34, "for", label34_for_value = `kit_${/*idx*/ ctx[28]}`);
    			attr_dev(label34, "class", "svelte-1k2g6qq");
    			add_location(label34, file, 420, 68, 33749);
    			option4.__value = "";
    			option4.value = option4.__value;
    			add_location(option4, file, 422, 72, 34025);
    			attr_dev(select4, "id", select4_id_value = `kit_${/*idx*/ ctx[28]}`);
    			attr_dev(select4, "name", select4_name_value = `kit_${/*idx*/ ctx[28]}`);
    			attr_dev(select4, "class", "svelte-1k2g6qq");
    			add_location(select4, file, 421, 68, 33855);
    			attr_dev(div56, "class", "field-row svelte-1k2g6qq");
    			add_location(div56, file, 419, 64, 33657);
    			attr_dev(div57, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div57, file, 418, 60, 33565);
    			attr_dev(label35, "for", label35_for_value = `racialEnemy_${/*idx*/ ctx[28]}`);
    			attr_dev(label35, "class", "svelte-1k2g6qq");
    			add_location(label35, file, 431, 68, 34824);
    			option5.__value = "";
    			option5.value = option5.__value;
    			add_location(option5, file, 433, 72, 35141);
    			attr_dev(select5, "id", select5_id_value = `racialEnemy_${/*idx*/ ctx[28]}`);
    			attr_dev(select5, "name", select5_name_value = `racialEnemy_${/*idx*/ ctx[28]}`);
    			attr_dev(select5, "class", "svelte-1k2g6qq");
    			add_location(select5, file, 432, 68, 34947);
    			attr_dev(div58, "class", "field-row svelte-1k2g6qq");
    			add_location(div58, file, 430, 64, 34732);
    			attr_dev(div59, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div59, file, 429, 60, 34640);
    			attr_dev(label36, "for", label36_for_value = `enemyAlly_${/*idx*/ ctx[28]}`);
    			attr_dev(label36, "class", "svelte-1k2g6qq");
    			add_location(label36, file, 442, 68, 35941);
    			option6.__value = "";
    			option6.value = option6.__value;
    			add_location(option6, file, 444, 72, 36248);
    			attr_dev(select6, "id", select6_id_value = `enemyAlly_${/*idx*/ ctx[28]}`);
    			attr_dev(select6, "name", select6_name_value = `enemyAlly_${/*idx*/ ctx[28]}`);
    			attr_dev(select6, "class", "svelte-1k2g6qq");
    			add_location(select6, file, 443, 68, 36060);
    			attr_dev(div60, "class", "field-row svelte-1k2g6qq");
    			add_location(div60, file, 441, 64, 35849);
    			attr_dev(div61, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div61, file, 440, 60, 35757);
    			attr_dev(label37, "for", label37_for_value = `movementSpeed_${/*idx*/ ctx[28]}`);
    			attr_dev(label37, "class", "svelte-1k2g6qq");
    			add_location(label37, file, 453, 68, 37046);
    			attr_dev(input32, "id", input32_id_value = `movementSpeed_${/*idx*/ ctx[28]}`);
    			attr_dev(input32, "name", input32_name_value = `movementSpeed_${/*idx*/ ctx[28]}`);
    			input32.disabled = true;
    			attr_dev(input32, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input32, "type", "text");
    			input32.value = "";
    			add_location(input32, file, 455, 68, 37255);
    			attr_dev(div62, "class", "field-row svelte-1k2g6qq");
    			add_location(div62, file, 452, 64, 36954);
    			attr_dev(div63, "class", "abilities-row svelte-1k2g6qq");
    			add_location(div63, file, 451, 60, 36862);
    			attr_dev(div64, "class", "characteristics-column svelte-1k2g6qq");
    			add_location(div64, file, 372, 56, 29008);
    			add_location(legend1, file, 461, 64, 37792);
    			attr_dev(label38, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label38, "for", label38_for_value = `strongestKillName_${/*idx*/ ctx[28]}`);
    			add_location(label38, file, 463, 68, 37976);
    			input33.disabled = true;
    			attr_dev(input33, "id", input33_id_value = `strongestKillName_${/*idx*/ ctx[28]}`);
    			attr_dev(input33, "name", input33_name_value = `strongestKillName_${/*idx*/ ctx[28]}`);
    			attr_dev(input33, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input33, "type", "text");
    			input33.value = "";
    			add_location(input33, file, 465, 68, 38268);
    			attr_dev(div65, "class", "field-row svelte-1k2g6qq");
    			add_location(div65, file, 462, 64, 37884);
    			attr_dev(label39, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label39, "for", label39_for_value = `strongestKillXP_${/*idx*/ ctx[28]}`);
    			add_location(label39, file, 468, 68, 38620);
    			attr_dev(input34, "id", input34_id_value = `strongestKillXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input34, "name", input34_name_value = `strongestKillXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input34, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input34, "type", "text");
    			input34.value = input34_value_value = /*hexEditor*/ ctx[6]?.readField('strongestKillXP', /*idx*/ ctx[28]);
    			add_location(input34, file, 469, 68, 38771);
    			attr_dev(div66, "class", "field-row svelte-1k2g6qq");
    			add_location(div66, file, 467, 64, 38528);
    			attr_dev(label40, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label40, "for", label40_for_value = `chapterKillsCount_${/*idx*/ ctx[28]}`);
    			add_location(label40, file, 472, 68, 39155);
    			attr_dev(input35, "id", input35_id_value = `chapterKillsCount_${/*idx*/ ctx[28]}`);
    			attr_dev(input35, "name", input35_name_value = `chapterKillsCount_${/*idx*/ ctx[28]}`);
    			attr_dev(input35, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input35, "type", "text");
    			input35.value = input35_value_value = /*hexEditor*/ ctx[6]?.readField('chapterKillsCount', /*idx*/ ctx[28]);
    			add_location(input35, file, 473, 68, 39304);
    			attr_dev(div67, "class", "field-row svelte-1k2g6qq");
    			add_location(div67, file, 471, 64, 39063);
    			attr_dev(label41, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label41, "for", label41_for_value = `chapterKillsXP_${/*idx*/ ctx[28]}`);
    			add_location(label41, file, 476, 68, 39694);
    			attr_dev(input36, "id", input36_id_value = `chapterKillsXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input36, "name", input36_name_value = `chapterKillsXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input36, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input36, "type", "text");
    			input36.value = input36_value_value = /*hexEditor*/ ctx[6]?.readField('chapterKillsXP', /*idx*/ ctx[28]);
    			add_location(input36, file, 477, 68, 39843);
    			attr_dev(div68, "class", "field-row svelte-1k2g6qq");
    			add_location(div68, file, 475, 64, 39602);
    			attr_dev(label42, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label42, "for", label42_for_value = `gameKillsCount_${/*idx*/ ctx[28]}`);
    			add_location(label42, file, 480, 68, 40224);
    			attr_dev(input37, "id", input37_id_value = `gameKillsCount_${/*idx*/ ctx[28]}`);
    			attr_dev(input37, "name", input37_name_value = `gameKillsCount_${/*idx*/ ctx[28]}`);
    			attr_dev(input37, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input37, "type", "text");
    			input37.value = input37_value_value = /*hexEditor*/ ctx[6]?.readField('gameKillsCount', /*idx*/ ctx[28]);
    			add_location(input37, file, 481, 68, 40367);
    			attr_dev(div69, "class", "field-row svelte-1k2g6qq");
    			add_location(div69, file, 479, 64, 40132);
    			attr_dev(label43, "class", "long-label svelte-1k2g6qq");
    			attr_dev(label43, "for", label43_for_value = `gameKillsXP_${/*idx*/ ctx[28]}`);
    			add_location(label43, file, 484, 68, 40748);
    			attr_dev(input38, "id", input38_id_value = `gameKillsXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input38, "name", input38_name_value = `gameKillsXP_${/*idx*/ ctx[28]}`);
    			attr_dev(input38, "class", "long-input svelte-1k2g6qq");
    			attr_dev(input38, "type", "text");
    			input38.value = input38_value_value = /*hexEditor*/ ctx[6]?.readField('gameKillsXP', /*idx*/ ctx[28]);
    			add_location(input38, file, 485, 68, 40891);
    			attr_dev(div70, "class", "field-row svelte-1k2g6qq");
    			add_location(div70, file, 483, 64, 40656);
    			add_location(fieldset1, file, 460, 60, 37717);
    			attr_dev(div71, "class", "stats-column svelte-1k2g6qq");
    			add_location(div71, file, 459, 56, 37630);
    			attr_dev(div72, "class", "tab-content svelte-1k2g6qq");
    			toggle_class(div72, "active", /*activeTab*/ ctx[7] === 1);
    			add_location(div72, file, 371, 52, 28895);
    			add_location(legend2, file, 493, 64, 41634);
    			attr_dev(label44, "for", label44_for_value = `resistAcid_${/*idx*/ ctx[28]}`);
    			attr_dev(label44, "class", "svelte-1k2g6qq");
    			add_location(label44, file, 495, 68, 41819);
    			attr_dev(input39, "id", input39_id_value = `resistAcid_${/*idx*/ ctx[28]}`);
    			attr_dev(input39, "name", input39_name_value = `resistAcid_${/*idx*/ ctx[28]}`);
    			attr_dev(input39, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input39, "type", "text");
    			input39.value = input39_value_value = /*hexEditor*/ ctx[6]?.readField('resistAcid', /*idx*/ ctx[28]);
    			add_location(input39, file, 496, 68, 41933);
    			attr_dev(div73, "class", "field-row svelte-1k2g6qq");
    			add_location(div73, file, 494, 64, 41727);
    			attr_dev(label45, "for", label45_for_value = `resistSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(label45, "class", "svelte-1k2g6qq");
    			add_location(label45, file, 499, 68, 42303);
    			attr_dev(input40, "id", input40_id_value = `resistSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(input40, "name", input40_name_value = `resistSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(input40, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input40, "type", "text");
    			input40.value = input40_value_value = /*hexEditor*/ ctx[6]?.readField('resistSlashing', /*idx*/ ctx[28]);
    			add_location(input40, file, 500, 68, 42425);
    			attr_dev(div74, "class", "field-row svelte-1k2g6qq");
    			add_location(div74, file, 498, 64, 42211);
    			attr_dev(label46, "for", label46_for_value = `resistCold_${/*idx*/ ctx[28]}`);
    			attr_dev(label46, "class", "svelte-1k2g6qq");
    			add_location(label46, file, 503, 68, 42807);
    			attr_dev(input41, "id", input41_id_value = `resistCold_${/*idx*/ ctx[28]}`);
    			attr_dev(input41, "name", input41_name_value = `resistCold_${/*idx*/ ctx[28]}`);
    			attr_dev(input41, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input41, "type", "text");
    			input41.value = input41_value_value = /*hexEditor*/ ctx[6]?.readField('resistCold', /*idx*/ ctx[28]);
    			add_location(input41, file, 504, 68, 42921);
    			attr_dev(div75, "class", "field-row svelte-1k2g6qq");
    			add_location(div75, file, 502, 64, 42715);
    			attr_dev(label47, "for", label47_for_value = `resistMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(label47, "class", "svelte-1k2g6qq");
    			add_location(label47, file, 507, 68, 43291);
    			attr_dev(input42, "id", input42_id_value = `resistMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(input42, "name", input42_name_value = `resistMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(input42, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input42, "type", "text");
    			input42.value = input42_value_value = /*hexEditor*/ ctx[6]?.readField('resistMissile', /*idx*/ ctx[28]);
    			add_location(input42, file, 508, 68, 43411);
    			attr_dev(div76, "class", "field-row svelte-1k2g6qq");
    			add_location(div76, file, 506, 64, 43199);
    			attr_dev(label48, "for", label48_for_value = `resistElectricity_${/*idx*/ ctx[28]}`);
    			attr_dev(label48, "class", "svelte-1k2g6qq");
    			add_location(label48, file, 511, 68, 43790);
    			attr_dev(input43, "id", input43_id_value = `resistElectricity_${/*idx*/ ctx[28]}`);
    			attr_dev(input43, "name", input43_name_value = `resistElectricity_${/*idx*/ ctx[28]}`);
    			attr_dev(input43, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input43, "type", "text");
    			input43.value = input43_value_value = /*hexEditor*/ ctx[6]?.readField('resistElectricity', /*idx*/ ctx[28]);
    			add_location(input43, file, 512, 68, 43918);
    			attr_dev(div77, "class", "field-row svelte-1k2g6qq");
    			add_location(div77, file, 510, 64, 43698);
    			attr_dev(label49, "for", label49_for_value = `resistMagic_${/*idx*/ ctx[28]}`);
    			attr_dev(label49, "class", "svelte-1k2g6qq");
    			add_location(label49, file, 515, 68, 44309);
    			attr_dev(input44, "id", input44_id_value = `resistMagic_${/*idx*/ ctx[28]}`);
    			attr_dev(input44, "name", input44_name_value = `resistMagic_${/*idx*/ ctx[28]}`);
    			attr_dev(input44, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input44, "type", "text");
    			input44.value = input44_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagic', /*idx*/ ctx[28]);
    			add_location(input44, file, 516, 68, 44425);
    			attr_dev(div78, "class", "field-row svelte-1k2g6qq");
    			add_location(div78, file, 514, 64, 44217);
    			attr_dev(label50, "for", label50_for_value = `resistFire_${/*idx*/ ctx[28]}`);
    			attr_dev(label50, "class", "svelte-1k2g6qq");
    			add_location(label50, file, 519, 68, 44798);
    			attr_dev(input45, "id", input45_id_value = `resistFire_${/*idx*/ ctx[28]}`);
    			attr_dev(input45, "name", input45_name_value = `resistFire_${/*idx*/ ctx[28]}`);
    			attr_dev(input45, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input45, "type", "text");
    			input45.value = input45_value_value = /*hexEditor*/ ctx[6]?.readField('resistFire', /*idx*/ ctx[28]);
    			add_location(input45, file, 520, 68, 44912);
    			attr_dev(div79, "class", "field-row svelte-1k2g6qq");
    			add_location(div79, file, 518, 64, 44706);
    			attr_dev(label51, "for", label51_for_value = `resistMagicFire_${/*idx*/ ctx[28]}`);
    			attr_dev(label51, "class", "svelte-1k2g6qq");
    			add_location(label51, file, 523, 68, 45282);
    			attr_dev(input46, "id", input46_id_value = `resistMagicFire_${/*idx*/ ctx[28]}`);
    			attr_dev(input46, "name", input46_name_value = `resistMagicFire_${/*idx*/ ctx[28]}`);
    			attr_dev(input46, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input46, "type", "text");
    			input46.value = input46_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagicFire', /*idx*/ ctx[28]);
    			add_location(input46, file, 524, 68, 45407);
    			attr_dev(div80, "class", "field-row svelte-1k2g6qq");
    			add_location(div80, file, 522, 64, 45190);
    			attr_dev(label52, "for", label52_for_value = `resistCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(label52, "class", "svelte-1k2g6qq");
    			add_location(label52, file, 527, 68, 45792);
    			attr_dev(input47, "id", input47_id_value = `resistCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(input47, "name", input47_name_value = `resistCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(input47, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input47, "type", "text");
    			input47.value = input47_value_value = /*hexEditor*/ ctx[6]?.readField('resistCrushing', /*idx*/ ctx[28]);
    			add_location(input47, file, 528, 68, 45914);
    			attr_dev(div81, "class", "field-row svelte-1k2g6qq");
    			add_location(div81, file, 526, 64, 45700);
    			attr_dev(label53, "for", label53_for_value = `resistMagicCold_${/*idx*/ ctx[28]}`);
    			attr_dev(label53, "class", "svelte-1k2g6qq");
    			add_location(label53, file, 531, 68, 46296);
    			attr_dev(input48, "id", input48_id_value = `resistMagicCold_${/*idx*/ ctx[28]}`);
    			attr_dev(input48, "name", input48_name_value = `resistMagicCold_${/*idx*/ ctx[28]}`);
    			attr_dev(input48, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input48, "type", "text");
    			input48.value = input48_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagicCold', /*idx*/ ctx[28]);
    			add_location(input48, file, 532, 68, 46421);
    			attr_dev(div82, "class", "field-row svelte-1k2g6qq");
    			add_location(div82, file, 530, 64, 46204);
    			attr_dev(label54, "for", label54_for_value = `resistPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(label54, "class", "svelte-1k2g6qq");
    			add_location(label54, file, 535, 68, 46806);
    			attr_dev(input49, "id", input49_id_value = `resistPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(input49, "name", input49_name_value = `resistPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(input49, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input49, "type", "text");
    			input49.value = input49_value_value = /*hexEditor*/ ctx[6]?.readField('resistPiercing', /*idx*/ ctx[28]);
    			add_location(input49, file, 536, 68, 46928);
    			attr_dev(div83, "class", "field-row svelte-1k2g6qq");
    			add_location(div83, file, 534, 64, 46714);
    			add_location(fieldset2, file, 492, 60, 41559);
    			attr_dev(div84, "class", "resistances-column svelte-1k2g6qq");
    			add_location(div84, file, 491, 56, 41466);
    			add_location(legend3, file, 542, 64, 47515);
    			attr_dev(label55, "for", label55_for_value = `saveVsDeath_${/*idx*/ ctx[28]}`);
    			attr_dev(label55, "class", "svelte-1k2g6qq");
    			add_location(label55, file, 544, 68, 47702);
    			attr_dev(input50, "id", input50_id_value = `saveVsDeath_${/*idx*/ ctx[28]}`);
    			attr_dev(input50, "name", input50_name_value = `saveVsDeath_${/*idx*/ ctx[28]}`);
    			attr_dev(input50, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input50, "type", "text");
    			input50.value = input50_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsDeath', /*idx*/ ctx[28]);
    			add_location(input50, file, 545, 68, 47840);
    			attr_dev(div85, "class", "field-row svelte-1k2g6qq");
    			add_location(div85, file, 543, 64, 47610);
    			attr_dev(label56, "for", label56_for_value = `saveVsWands_${/*idx*/ ctx[28]}`);
    			attr_dev(label56, "class", "svelte-1k2g6qq");
    			add_location(label56, file, 548, 68, 48213);
    			attr_dev(input51, "id", input51_id_value = `saveVsWands_${/*idx*/ ctx[28]}`);
    			attr_dev(input51, "name", input51_name_value = `saveVsWands_${/*idx*/ ctx[28]}`);
    			attr_dev(input51, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input51, "type", "text");
    			input51.value = input51_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsWands', /*idx*/ ctx[28]);
    			add_location(input51, file, 549, 68, 48340);
    			attr_dev(div86, "class", "field-row svelte-1k2g6qq");
    			add_location(div86, file, 547, 64, 48121);
    			attr_dev(label57, "for", label57_for_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`);
    			attr_dev(label57, "class", "svelte-1k2g6qq");
    			add_location(label57, file, 552, 68, 48713);
    			attr_dev(input52, "id", input52_id_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`);
    			attr_dev(input52, "name", input52_name_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`);
    			attr_dev(input52, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input52, "type", "text");
    			input52.value = input52_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsPolymorph', /*idx*/ ctx[28]);
    			add_location(input52, file, 553, 68, 48852);
    			attr_dev(div87, "class", "field-row svelte-1k2g6qq");
    			add_location(div87, file, 551, 64, 48621);
    			attr_dev(label58, "for", label58_for_value = `saveVsBreath_${/*idx*/ ctx[28]}`);
    			attr_dev(label58, "class", "svelte-1k2g6qq");
    			add_location(label58, file, 556, 68, 49237);
    			attr_dev(input53, "id", input53_id_value = `saveVsBreath_${/*idx*/ ctx[28]}`);
    			attr_dev(input53, "name", input53_name_value = `saveVsBreath_${/*idx*/ ctx[28]}`);
    			attr_dev(input53, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input53, "type", "text");
    			input53.value = input53_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsBreath', /*idx*/ ctx[28]);
    			add_location(input53, file, 557, 68, 49363);
    			attr_dev(div88, "class", "field-row svelte-1k2g6qq");
    			add_location(div88, file, 555, 64, 49145);
    			attr_dev(label59, "for", label59_for_value = `saveVsSpells_${/*idx*/ ctx[28]}`);
    			attr_dev(label59, "class", "svelte-1k2g6qq");
    			add_location(label59, file, 560, 68, 49739);
    			attr_dev(input54, "id", input54_id_value = `saveVsSpells_${/*idx*/ ctx[28]}`);
    			attr_dev(input54, "name", input54_name_value = `saveVsSpells_${/*idx*/ ctx[28]}`);
    			attr_dev(input54, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input54, "type", "text");
    			input54.value = input54_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsSpells', /*idx*/ ctx[28]);
    			add_location(input54, file, 561, 68, 49857);
    			attr_dev(div89, "class", "field-row svelte-1k2g6qq");
    			add_location(div89, file, 559, 64, 49647);
    			add_location(fieldset3, file, 541, 60, 47440);
    			attr_dev(div90, "class", "saving-throws-column svelte-1k2g6qq");
    			add_location(div90, file, 540, 56, 47345);
    			add_location(legend4, file, 567, 64, 50437);
    			attr_dev(label60, "for", label60_for_value = `acSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(label60, "class", "svelte-1k2g6qq");
    			add_location(label60, file, 569, 68, 50633);
    			attr_dev(input55, "id", input55_id_value = `acSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(input55, "name", input55_name_value = `acSlashing_${/*idx*/ ctx[28]}`);
    			attr_dev(input55, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input55, "type", "text");
    			input55.value = input55_value_value = /*hexEditor*/ ctx[6]?.readField('acSlashing', /*idx*/ ctx[28]);
    			add_location(input55, file, 570, 68, 50751);
    			attr_dev(div91, "class", "field-row svelte-1k2g6qq");
    			add_location(div91, file, 568, 64, 50541);
    			attr_dev(label61, "for", label61_for_value = `acMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(label61, "class", "svelte-1k2g6qq");
    			add_location(label61, file, 573, 68, 51121);
    			attr_dev(input56, "id", input56_id_value = `acMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(input56, "name", input56_name_value = `acMissile_${/*idx*/ ctx[28]}`);
    			attr_dev(input56, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input56, "type", "text");
    			input56.value = input56_value_value = /*hexEditor*/ ctx[6]?.readField('acMissile', /*idx*/ ctx[28]);
    			add_location(input56, file, 574, 68, 51237);
    			attr_dev(div92, "class", "field-row svelte-1k2g6qq");
    			add_location(div92, file, 572, 64, 51029);
    			attr_dev(label62, "for", label62_for_value = `acCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(label62, "class", "svelte-1k2g6qq");
    			add_location(label62, file, 577, 68, 51604);
    			attr_dev(input57, "id", input57_id_value = `acCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(input57, "name", input57_name_value = `acCrushing_${/*idx*/ ctx[28]}`);
    			attr_dev(input57, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input57, "type", "text");
    			input57.value = input57_value_value = /*hexEditor*/ ctx[6]?.readField('acCrushing', /*idx*/ ctx[28]);
    			add_location(input57, file, 578, 68, 51722);
    			attr_dev(div93, "class", "field-row svelte-1k2g6qq");
    			add_location(div93, file, 576, 64, 51512);
    			attr_dev(label63, "for", label63_for_value = `acPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(label63, "class", "svelte-1k2g6qq");
    			add_location(label63, file, 581, 68, 52092);
    			attr_dev(input58, "id", input58_id_value = `acPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(input58, "name", input58_name_value = `acPiercing_${/*idx*/ ctx[28]}`);
    			attr_dev(input58, "class", "short-input svelte-1k2g6qq");
    			attr_dev(input58, "type", "text");
    			input58.value = input58_value_value = /*hexEditor*/ ctx[6]?.readField('acPiercing', /*idx*/ ctx[28]);
    			add_location(input58, file, 582, 68, 52210);
    			attr_dev(div94, "class", "field-row svelte-1k2g6qq");
    			add_location(div94, file, 580, 64, 52000);
    			add_location(fieldset4, file, 566, 60, 50362);
    			attr_dev(div95, "class", "armour-class-column svelte-1k2g6qq");
    			add_location(div95, file, 565, 56, 50268);
    			attr_dev(div96, "class", "tab-content svelte-1k2g6qq");
    			toggle_class(div96, "active", /*activeTab*/ ctx[7] === 2);
    			add_location(div96, file, 490, 52, 41353);
    			attr_dev(div97, "class", "weapons-proficiencies-column svelte-1k2g6qq");
    			add_location(div97, file, 588, 56, 52783);
    			attr_dev(div98, "class", "tab-content svelte-1k2g6qq");
    			toggle_class(div98, "active", /*activeTab*/ ctx[7] === 3);
    			add_location(div98, file, 587, 52, 52670);
    			attr_dev(div99, "class", "tab-contents svelte-1k2g6qq");
    			add_location(div99, file, 210, 48, 9940);
    			attr_dev(div100, "class", "tabs-column svelte-1k2g6qq");
    			toggle_class(div100, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			add_location(div100, file, 203, 44, 9099);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div100, anchor);
    			append_dev(div100, div4);
    			append_dev(div4, div0);
    			append_dev(div0, u);
    			append_dev(div0, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div4, t4);
    			append_dev(div4, div2);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div100, t8);
    			append_dev(div100, div99);
    			append_dev(div99, div47);
    			append_dev(div47, div38);
    			append_dev(div38, div8);
    			append_dev(div8, div5);
    			append_dev(div5, label0);
    			append_dev(label0, t9);
    			append_dev(div5, t10);
    			append_dev(div5, input0);
    			append_dev(div8, t11);
    			append_dev(div8, div6);
    			append_dev(div6, label1);
    			append_dev(label1, t12);
    			append_dev(div6, t13);
    			append_dev(div6, input1);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div7, label2);
    			append_dev(label2, t15);
    			append_dev(div7, t16);
    			append_dev(div7, input2);
    			append_dev(div38, t17);
    			append_dev(div38, div11);
    			append_dev(div11, div9);
    			append_dev(div9, label3);
    			append_dev(label3, t18);
    			append_dev(div9, t19);
    			append_dev(div9, input3);
    			append_dev(div11, t20);
    			append_dev(div11, div10);
    			append_dev(div10, label4);
    			append_dev(label4, t21);
    			append_dev(div10, t22);
    			append_dev(div10, input4);
    			append_dev(div38, t23);
    			append_dev(div38, div14);
    			append_dev(div14, div12);
    			append_dev(div12, label5);
    			append_dev(label5, t24);
    			append_dev(div12, t25);
    			append_dev(div12, input5);
    			append_dev(div14, t26);
    			append_dev(div14, div13);
    			append_dev(div13, label6);
    			append_dev(label6, t27);
    			append_dev(div13, t28);
    			append_dev(div13, input6);
    			append_dev(div38, t29);
    			append_dev(div38, div15);
    			append_dev(div38, t30);
    			append_dev(div38, div19);
    			append_dev(div19, div16);
    			append_dev(div16, label7);
    			append_dev(label7, t31);
    			append_dev(div16, t32);
    			append_dev(div16, input7);
    			append_dev(div19, t33);
    			append_dev(div19, div17);
    			append_dev(div17, label8);
    			append_dev(label8, t34);
    			append_dev(div17, t35);
    			append_dev(div17, input8);
    			append_dev(div19, t36);
    			append_dev(div19, div18);
    			append_dev(div18, label9);
    			append_dev(label9, t37);
    			append_dev(div18, t38);
    			append_dev(div18, input9);
    			append_dev(div38, t39);
    			append_dev(div38, div23);
    			append_dev(div23, div20);
    			append_dev(div20, label10);
    			append_dev(label10, t40);
    			append_dev(div20, t41);
    			append_dev(div20, input10);
    			append_dev(div23, t42);
    			append_dev(div23, div21);
    			append_dev(div21, label11);
    			append_dev(label11, t43);
    			append_dev(div21, t44);
    			append_dev(div21, input11);
    			append_dev(div23, t45);
    			append_dev(div23, div22);
    			append_dev(div22, label12);
    			append_dev(label12, t46);
    			append_dev(div22, t47);
    			append_dev(div22, input12);
    			append_dev(div38, t48);
    			append_dev(div38, div27);
    			append_dev(div27, div24);
    			append_dev(div24, label13);
    			append_dev(label13, t49);
    			append_dev(div24, t50);
    			append_dev(div24, input13);
    			append_dev(div27, t51);
    			append_dev(div27, div25);
    			append_dev(div25, label14);
    			append_dev(label14, t52);
    			append_dev(div25, t53);
    			append_dev(div25, input14);
    			append_dev(div27, t54);
    			append_dev(div27, div26);
    			append_dev(div26, label15);
    			append_dev(label15, t55);
    			append_dev(div26, t56);
    			append_dev(div26, input15);
    			append_dev(div38, t57);
    			append_dev(div38, div31);
    			append_dev(div31, div28);
    			append_dev(div28, label16);
    			append_dev(label16, t58);
    			append_dev(div28, t59);
    			append_dev(div28, input16);
    			append_dev(div31, t60);
    			append_dev(div31, div29);
    			append_dev(div29, label17);
    			append_dev(label17, t61);
    			append_dev(div29, t62);
    			append_dev(div29, input17);
    			append_dev(div29, t63);
    			append_dev(div29, input18);
    			append_dev(div29, t64);
    			append_dev(div29, input19);
    			append_dev(div31, t65);
    			append_dev(div31, div30);
    			append_dev(div30, label18);
    			append_dev(label18, t66);
    			append_dev(div30, t67);
    			append_dev(div30, input20);
    			append_dev(div38, t68);
    			append_dev(div38, div35);
    			append_dev(div35, div32);
    			append_dev(div32, label19);
    			append_dev(label19, t69);
    			append_dev(div32, t70);
    			append_dev(div32, input21);
    			append_dev(div35, t71);
    			append_dev(div35, div33);
    			append_dev(div33, label20);
    			append_dev(label20, t72);
    			append_dev(div33, t73);
    			append_dev(div33, input22);
    			append_dev(div35, t74);
    			append_dev(div35, div34);
    			append_dev(div34, label21);
    			append_dev(label21, t75);
    			append_dev(div34, t76);
    			append_dev(div34, input23);
    			append_dev(div38, t77);
    			append_dev(div38, div37);
    			append_dev(div37, div36);
    			append_dev(div36, label22);
    			append_dev(label22, t78);
    			append_dev(div36, t79);
    			append_dev(div36, input24);
    			append_dev(div47, t80);
    			append_dev(div47, div46);
    			append_dev(div46, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t82);
    			append_dev(fieldset0, div39);
    			append_dev(div39, label23);
    			append_dev(label23, t83);
    			append_dev(div39, t84);
    			append_dev(div39, input25);
    			append_dev(fieldset0, t85);
    			append_dev(fieldset0, div40);
    			append_dev(div40, label24);
    			append_dev(label24, t86);
    			append_dev(div40, t87);
    			append_dev(div40, input26);
    			append_dev(fieldset0, t88);
    			append_dev(fieldset0, div41);
    			append_dev(div41, label25);
    			append_dev(label25, t89);
    			append_dev(div41, t90);
    			append_dev(div41, input27);
    			append_dev(fieldset0, t91);
    			append_dev(fieldset0, div42);
    			append_dev(div42, label26);
    			append_dev(label26, t92);
    			append_dev(div42, t93);
    			append_dev(div42, input28);
    			append_dev(fieldset0, t94);
    			append_dev(fieldset0, div43);
    			append_dev(div43, label27);
    			append_dev(label27, t95);
    			append_dev(div43, t96);
    			append_dev(div43, input29);
    			append_dev(fieldset0, t97);
    			append_dev(fieldset0, div44);
    			append_dev(div44, label28);
    			append_dev(label28, t98);
    			append_dev(div44, t99);
    			append_dev(div44, input30);
    			append_dev(fieldset0, t100);
    			append_dev(fieldset0, div45);
    			append_dev(div45, label29);
    			append_dev(label29, t101);
    			append_dev(div45, t102);
    			append_dev(div45, input31);
    			append_dev(div99, t103);
    			append_dev(div99, div72);
    			append_dev(div72, div64);
    			append_dev(div64, div49);
    			append_dev(div49, div48);
    			append_dev(div48, label30);
    			append_dev(label30, t104);
    			append_dev(div48, t105);
    			append_dev(div48, select0);
    			append_dev(select0, option0);

    			for (let i = 0; i < each_blocks_7.length; i += 1) {
    				each_blocks_7[i].m(select0, null);
    			}

    			select_option(select0, /*hexEditor*/ ctx[6]?.readField('gender', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t106);
    			append_dev(div64, div51);
    			append_dev(div51, div50);
    			append_dev(div50, label31);
    			append_dev(label31, t107);
    			append_dev(div50, t108);
    			append_dev(div50, select1);
    			append_dev(select1, option1);

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				each_blocks_6[i].m(select1, null);
    			}

    			select_option(select1, /*hexEditor*/ ctx[6]?.readField('race', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t109);
    			append_dev(div64, div53);
    			append_dev(div53, div52);
    			append_dev(div52, label32);
    			append_dev(label32, t110);
    			append_dev(div52, t111);
    			append_dev(div52, select2);
    			append_dev(select2, option2);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(select2, null);
    			}

    			select_option(select2, /*hexEditor*/ ctx[6]?.readField('alignment', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t112);
    			append_dev(div64, div55);
    			append_dev(div55, div54);
    			append_dev(div54, label33);
    			append_dev(label33, t113);
    			append_dev(div54, t114);
    			append_dev(div54, select3);
    			append_dev(select3, option3);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(select3, null);
    			}

    			select_option(select3, /*hexEditor*/ ctx[6]?.readField('class', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t115);
    			append_dev(div64, div57);
    			append_dev(div57, div56);
    			append_dev(div56, label34);
    			append_dev(label34, t116);
    			append_dev(div56, t117);
    			append_dev(div56, select4);
    			append_dev(select4, option4);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(select4, null);
    			}

    			select_option(select4, /*hexEditor*/ ctx[6]?.readField('kit', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t118);
    			append_dev(div64, div59);
    			append_dev(div59, div58);
    			append_dev(div58, label35);
    			append_dev(label35, t119);
    			append_dev(div58, t120);
    			append_dev(div58, select5);
    			append_dev(select5, option5);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(select5, null);
    			}

    			select_option(select5, /*hexEditor*/ ctx[6]?.readField('racialEnemy', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t121);
    			append_dev(div64, div61);
    			append_dev(div61, div60);
    			append_dev(div60, label36);
    			append_dev(label36, t122);
    			append_dev(div60, t123);
    			append_dev(div60, select6);
    			append_dev(select6, option6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select6, null);
    			}

    			select_option(select6, /*hexEditor*/ ctx[6]?.readField('enemyAlly', /*idx*/ ctx[28]).toString());
    			append_dev(div64, t124);
    			append_dev(div64, div63);
    			append_dev(div63, div62);
    			append_dev(div62, label37);
    			append_dev(label37, t125);
    			append_dev(div62, t126);
    			append_dev(div62, input32);
    			append_dev(div72, t127);
    			append_dev(div72, div71);
    			append_dev(div71, fieldset1);
    			append_dev(fieldset1, legend1);
    			append_dev(fieldset1, t129);
    			append_dev(fieldset1, div65);
    			append_dev(div65, label38);
    			append_dev(label38, t130);
    			append_dev(div65, t131);
    			append_dev(div65, input33);
    			append_dev(fieldset1, t132);
    			append_dev(fieldset1, div66);
    			append_dev(div66, label39);
    			append_dev(label39, t133);
    			append_dev(div66, t134);
    			append_dev(div66, input34);
    			append_dev(fieldset1, t135);
    			append_dev(fieldset1, div67);
    			append_dev(div67, label40);
    			append_dev(label40, t136);
    			append_dev(div67, t137);
    			append_dev(div67, input35);
    			append_dev(fieldset1, t138);
    			append_dev(fieldset1, div68);
    			append_dev(div68, label41);
    			append_dev(label41, t139);
    			append_dev(div68, t140);
    			append_dev(div68, input36);
    			append_dev(fieldset1, t141);
    			append_dev(fieldset1, div69);
    			append_dev(div69, label42);
    			append_dev(label42, t142);
    			append_dev(div69, t143);
    			append_dev(div69, input37);
    			append_dev(fieldset1, t144);
    			append_dev(fieldset1, div70);
    			append_dev(div70, label43);
    			append_dev(label43, t145);
    			append_dev(div70, t146);
    			append_dev(div70, input38);
    			append_dev(div99, t147);
    			append_dev(div99, div96);
    			append_dev(div96, div84);
    			append_dev(div84, fieldset2);
    			append_dev(fieldset2, legend2);
    			append_dev(fieldset2, t149);
    			append_dev(fieldset2, div73);
    			append_dev(div73, label44);
    			append_dev(label44, t150);
    			append_dev(div73, t151);
    			append_dev(div73, input39);
    			append_dev(fieldset2, t152);
    			append_dev(fieldset2, div74);
    			append_dev(div74, label45);
    			append_dev(label45, t153);
    			append_dev(div74, t154);
    			append_dev(div74, input40);
    			append_dev(fieldset2, t155);
    			append_dev(fieldset2, div75);
    			append_dev(div75, label46);
    			append_dev(label46, t156);
    			append_dev(div75, t157);
    			append_dev(div75, input41);
    			append_dev(fieldset2, t158);
    			append_dev(fieldset2, div76);
    			append_dev(div76, label47);
    			append_dev(label47, t159);
    			append_dev(div76, t160);
    			append_dev(div76, input42);
    			append_dev(fieldset2, t161);
    			append_dev(fieldset2, div77);
    			append_dev(div77, label48);
    			append_dev(label48, t162);
    			append_dev(div77, t163);
    			append_dev(div77, input43);
    			append_dev(fieldset2, t164);
    			append_dev(fieldset2, div78);
    			append_dev(div78, label49);
    			append_dev(label49, t165);
    			append_dev(div78, t166);
    			append_dev(div78, input44);
    			append_dev(fieldset2, t167);
    			append_dev(fieldset2, div79);
    			append_dev(div79, label50);
    			append_dev(label50, t168);
    			append_dev(div79, t169);
    			append_dev(div79, input45);
    			append_dev(fieldset2, t170);
    			append_dev(fieldset2, div80);
    			append_dev(div80, label51);
    			append_dev(label51, t171);
    			append_dev(div80, t172);
    			append_dev(div80, input46);
    			append_dev(fieldset2, t173);
    			append_dev(fieldset2, div81);
    			append_dev(div81, label52);
    			append_dev(label52, t174);
    			append_dev(div81, t175);
    			append_dev(div81, input47);
    			append_dev(fieldset2, t176);
    			append_dev(fieldset2, div82);
    			append_dev(div82, label53);
    			append_dev(label53, t177);
    			append_dev(div82, t178);
    			append_dev(div82, input48);
    			append_dev(fieldset2, t179);
    			append_dev(fieldset2, div83);
    			append_dev(div83, label54);
    			append_dev(label54, t180);
    			append_dev(div83, t181);
    			append_dev(div83, input49);
    			append_dev(div96, t182);
    			append_dev(div96, div90);
    			append_dev(div90, fieldset3);
    			append_dev(fieldset3, legend3);
    			append_dev(fieldset3, t184);
    			append_dev(fieldset3, div85);
    			append_dev(div85, label55);
    			append_dev(label55, t185);
    			append_dev(div85, t186);
    			append_dev(div85, input50);
    			append_dev(fieldset3, t187);
    			append_dev(fieldset3, div86);
    			append_dev(div86, label56);
    			append_dev(label56, t188);
    			append_dev(div86, t189);
    			append_dev(div86, input51);
    			append_dev(fieldset3, t190);
    			append_dev(fieldset3, div87);
    			append_dev(div87, label57);
    			append_dev(label57, t191);
    			append_dev(div87, t192);
    			append_dev(div87, input52);
    			append_dev(fieldset3, t193);
    			append_dev(fieldset3, div88);
    			append_dev(div88, label58);
    			append_dev(label58, t194);
    			append_dev(div88, t195);
    			append_dev(div88, input53);
    			append_dev(fieldset3, t196);
    			append_dev(fieldset3, div89);
    			append_dev(div89, label59);
    			append_dev(label59, t197);
    			append_dev(div89, t198);
    			append_dev(div89, input54);
    			append_dev(div96, t199);
    			append_dev(div96, div95);
    			append_dev(div95, fieldset4);
    			append_dev(fieldset4, legend4);
    			append_dev(fieldset4, t201);
    			append_dev(fieldset4, div91);
    			append_dev(div91, label60);
    			append_dev(label60, t202);
    			append_dev(div91, t203);
    			append_dev(div91, input55);
    			append_dev(fieldset4, t204);
    			append_dev(fieldset4, div92);
    			append_dev(div92, label61);
    			append_dev(label61, t205);
    			append_dev(div92, t206);
    			append_dev(div92, input56);
    			append_dev(fieldset4, t207);
    			append_dev(fieldset4, div93);
    			append_dev(div93, label62);
    			append_dev(label62, t208);
    			append_dev(div93, t209);
    			append_dev(div93, input57);
    			append_dev(fieldset4, t210);
    			append_dev(fieldset4, div94);
    			append_dev(div94, label63);
    			append_dev(label63, t211);
    			append_dev(div94, t212);
    			append_dev(div94, input58);
    			append_dev(div99, t213);
    			append_dev(div99, div98);
    			append_dev(div98, div97);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div97, null);
    			}

    			append_dev(div100, t214);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler_2*/ ctx[22], false, false, false),
    					listen_dev(div1, "click", /*click_handler_3*/ ctx[23], false, false, false),
    					listen_dev(div2, "click", /*click_handler_4*/ ctx[24], false, false, false),
    					listen_dev(div3, "click", /*click_handler_5*/ ctx[25], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div0, "active", /*activeTab*/ ctx[7] === 0);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div1, "active", /*activeTab*/ ctx[7] === 1);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div2, "active", /*activeTab*/ ctx[7] === 2);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div3, "active", /*activeTab*/ ctx[7] === 3);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label0_for_value !== (label0_for_value = `strength_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label0, "for", label0_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input0_id_value !== (input0_id_value = `strength_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input0, "id", input0_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input0_name_value !== (input0_name_value = `strength_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input0, "name", input0_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input0_value_value !== (input0_value_value = /*hexEditor*/ ctx[6]?.readField('strength', /*idx*/ ctx[28])) && input0.value !== input0_value_value) {
    				prop_dev(input0, "value", input0_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label1_for_value !== (label1_for_value = `constitution_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label1, "for", label1_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input1_id_value !== (input1_id_value = `constitution_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input1_name_value !== (input1_name_value = `constitution_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input1, "name", input1_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input1_value_value !== (input1_value_value = /*hexEditor*/ ctx[6]?.readField('constitution', /*idx*/ ctx[28])) && input1.value !== input1_value_value) {
    				prop_dev(input1, "value", input1_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label2_for_value !== (label2_for_value = `charisma_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label2, "for", label2_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input2_id_value !== (input2_id_value = `charisma_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input2, "id", input2_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input2_name_value !== (input2_name_value = `charisma_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input2, "name", input2_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input2_value_value !== (input2_value_value = /*hexEditor*/ ctx[6]?.readField('charisma', /*idx*/ ctx[28])) && input2.value !== input2_value_value) {
    				prop_dev(input2, "value", input2_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label3_for_value !== (label3_for_value = `strengthBonus_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label3, "for", label3_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input3_id_value !== (input3_id_value = `strengthBonus_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input3, "id", input3_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input3_name_value !== (input3_name_value = `strengthBonus_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input3, "name", input3_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input3_value_value !== (input3_value_value = /*hexEditor*/ ctx[6]?.readField('strengthBonus', /*idx*/ ctx[28])) && input3.value !== input3_value_value) {
    				prop_dev(input3, "value", input3_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label4_for_value !== (label4_for_value = `intelligence_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label4, "for", label4_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input4_id_value !== (input4_id_value = `intelligence_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input4, "id", input4_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input4_name_value !== (input4_name_value = `intelligence_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input4, "name", input4_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input4_value_value !== (input4_value_value = /*hexEditor*/ ctx[6]?.readField('intelligence', /*idx*/ ctx[28])) && input4.value !== input4_value_value) {
    				prop_dev(input4, "value", input4_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label5_for_value !== (label5_for_value = `dexterity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label5, "for", label5_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input5_id_value !== (input5_id_value = `dexterity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input5, "id", input5_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input5_name_value !== (input5_name_value = `dexterity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input5, "name", input5_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input5_value_value !== (input5_value_value = /*hexEditor*/ ctx[6]?.readField('dexterity', /*idx*/ ctx[28])) && input5.value !== input5_value_value) {
    				prop_dev(input5, "value", input5_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label6_for_value !== (label6_for_value = `wisdom_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label6, "for", label6_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input6_id_value !== (input6_id_value = `wisdom_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input6, "id", input6_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input6_name_value !== (input6_name_value = `wisdom_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input6, "name", input6_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input6_value_value !== (input6_value_value = /*hexEditor*/ ctx[6]?.readField('wisdom', /*idx*/ ctx[28])) && input6.value !== input6_value_value) {
    				prop_dev(input6, "value", input6_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label7_for_value !== (label7_for_value = `maxHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label7, "for", label7_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input7_id_value !== (input7_id_value = `maxHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input7, "id", input7_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input7_name_value !== (input7_name_value = `maxHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input7, "name", input7_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input7_value_value !== (input7_value_value = /*hexEditor*/ ctx[6]?.readField('maxHitPoints', /*idx*/ ctx[28])) && input7.value !== input7_value_value) {
    				prop_dev(input7, "value", input7_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label8_for_value !== (label8_for_value = `attacksPerRound_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label8, "for", label8_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input8_id_value !== (input8_id_value = `attacksPerRound_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input8, "id", input8_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input8_name_value !== (input8_name_value = `attacksPerRound_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input8, "name", input8_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input8_value_value !== (input8_value_value = /*hexEditor*/ ctx[6]?.readField('attacksPerRound', /*idx*/ ctx[28])) && input8.value !== input8_value_value) {
    				prop_dev(input8, "value", input8_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label9_for_value !== (label9_for_value = `fatigue_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label9, "for", label9_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input9_id_value !== (input9_id_value = `fatigue_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input9, "id", input9_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input9_name_value !== (input9_name_value = `fatigue_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input9, "name", input9_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input9_value_value !== (input9_value_value = /*hexEditor*/ ctx[6]?.readField('fatigue', /*idx*/ ctx[28])) && input9.value !== input9_value_value) {
    				prop_dev(input9, "value", input9_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label10_for_value !== (label10_for_value = `currentHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label10, "for", label10_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input10_id_value !== (input10_id_value = `currentHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input10, "id", input10_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input10_name_value !== (input10_name_value = `currentHitPoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input10, "name", input10_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input10_value_value !== (input10_value_value = /*hexEditor*/ ctx[6]?.readField('currentHitPoints', /*idx*/ ctx[28])) && input10.value !== input10_value_value) {
    				prop_dev(input10, "value", input10_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label11_for_value !== (label11_for_value = `experiencePoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label11, "for", label11_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input11_id_value !== (input11_id_value = `experiencePoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input11, "id", input11_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input11_name_value !== (input11_name_value = `experiencePoints_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input11, "name", input11_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input11_value_value !== (input11_value_value = /*hexEditor*/ ctx[6]?.readField('experiencePoints', /*idx*/ ctx[28])) && input11.value !== input11_value_value) {
    				prop_dev(input11, "value", input11_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label12_for_value !== (label12_for_value = `intoxication_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label12, "for", label12_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input12_id_value !== (input12_id_value = `intoxication_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input12, "id", input12_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input12_name_value !== (input12_name_value = `intoxication_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input12, "name", input12_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input12_value_value !== (input12_value_value = /*hexEditor*/ ctx[6]?.readField('intoxication', /*idx*/ ctx[28])) && input12.value !== input12_value_value) {
    				prop_dev(input12, "value", input12_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label13_for_value !== (label13_for_value = `acNatural_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label13, "for", label13_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input13_id_value !== (input13_id_value = `acNatural_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input13, "id", input13_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input13_name_value !== (input13_name_value = `acNatural_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input13, "name", input13_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input13_value_value !== (input13_value_value = /*hexEditor*/ ctx[6]?.readField('acNatural', /*idx*/ ctx[28])) && input13.value !== input13_value_value) {
    				prop_dev(input13, "value", input13_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label14_for_value !== (label14_for_value = `experienceForKill_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label14, "for", label14_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input14_id_value !== (input14_id_value = `experienceForKill_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input14, "id", input14_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input14_name_value !== (input14_name_value = `experienceForKill_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input14, "name", input14_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input14_value_value !== (input14_value_value = /*hexEditor*/ ctx[6]?.readField('experienceForKill', /*idx*/ ctx[28])) && input14.value !== input14_value_value) {
    				prop_dev(input14, "value", input14_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label15_for_value !== (label15_for_value = `morale_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label15, "for", label15_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input15_id_value !== (input15_id_value = `morale_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input15, "id", input15_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input15_name_value !== (input15_name_value = `morale_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input15, "name", input15_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input15_value_value !== (input15_value_value = /*hexEditor*/ ctx[6]?.readField('morale', /*idx*/ ctx[28])) && input15.value !== input15_value_value) {
    				prop_dev(input15, "value", input15_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label16_for_value !== (label16_for_value = `acEffective_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label16, "for", label16_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input16_id_value !== (input16_id_value = `acEffective_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input16, "id", input16_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input16_name_value !== (input16_name_value = `acEffective_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input16, "name", input16_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input16_value_value !== (input16_value_value = /*hexEditor*/ ctx[6]?.readField('acEffective', /*idx*/ ctx[28])) && input16.value !== input16_value_value) {
    				prop_dev(input16, "value", input16_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label17_for_value !== (label17_for_value = `level1_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label17, "for", label17_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input17_id_value !== (input17_id_value = `level1_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input17, "id", input17_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input17_name_value !== (input17_name_value = `level1_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input17, "name", input17_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input17_value_value !== (input17_value_value = /*hexEditor*/ ctx[6]?.readField('level1', /*idx*/ ctx[28])) && input17.value !== input17_value_value) {
    				prop_dev(input17, "value", input17_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input18_id_value !== (input18_id_value = `level2_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input18, "id", input18_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input18_name_value !== (input18_name_value = `level2_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input18, "name", input18_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input18_value_value !== (input18_value_value = /*hexEditor*/ ctx[6]?.readField('level2', /*idx*/ ctx[28])) && input18.value !== input18_value_value) {
    				prop_dev(input18, "value", input18_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input19_id_value !== (input19_id_value = `level3_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input19, "id", input19_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input19_name_value !== (input19_name_value = `level3_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input19, "name", input19_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input19_value_value !== (input19_value_value = /*hexEditor*/ ctx[6]?.readField('level3', /*idx*/ ctx[28])) && input19.value !== input19_value_value) {
    				prop_dev(input19, "value", input19_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label18_for_value !== (label18_for_value = `moraleBreak_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label18, "for", label18_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input20_id_value !== (input20_id_value = `moraleBreak_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input20, "id", input20_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input20_name_value !== (input20_name_value = `moraleBreak_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input20, "name", input20_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input20_value_value !== (input20_value_value = /*hexEditor*/ ctx[6]?.readField('moraleBreak', /*idx*/ ctx[28])) && input20.value !== input20_value_value) {
    				prop_dev(input20, "value", input20_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label19_for_value !== (label19_for_value = `thac0_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label19, "for", label19_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input21_id_value !== (input21_id_value = `thac0_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input21, "id", input21_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input21_name_value !== (input21_name_value = `thac0_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input21, "name", input21_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input21_value_value !== (input21_value_value = /*hexEditor*/ ctx[6]?.readField('thac0', /*idx*/ ctx[28])) && input21.value !== input21_value_value) {
    				prop_dev(input21, "value", input21_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label20_for_value !== (label20_for_value = `partyGold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label20, "for", label20_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input22_id_value !== (input22_id_value = `partyGold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input22, "id", input22_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input22_name_value !== (input22_name_value = `partyGold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input22, "name", input22_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input22_value_value !== (input22_value_value = /*hexEditor*/ ctx[6]?.readField('partyGold')) && input22.value !== input22_value_value) {
    				prop_dev(input22, "value", input22_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label21_for_value !== (label21_for_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label21, "for", label21_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input23_id_value !== (input23_id_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input23, "id", input23_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input23_name_value !== (input23_name_value = `moraleRecoveryTime_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input23, "name", input23_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input23_value_value !== (input23_value_value = /*hexEditor*/ ctx[6]?.readField('moraleRecoveryTime', /*idx*/ ctx[28])) && input23.value !== input23_value_value) {
    				prop_dev(input23, "value", input23_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label22_for_value !== (label22_for_value = `partyReputation_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label22, "for", label22_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input24_id_value !== (input24_id_value = `partyReputation_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input24, "id", input24_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input24_name_value !== (input24_name_value = `partyReputation_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input24, "name", input24_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input24_value_value !== (input24_value_value = /*hexEditor*/ ctx[6]?.readField('partyReputation')) && input24.value !== input24_value_value) {
    				prop_dev(input24, "value", input24_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label23_for_value !== (label23_for_value = `moveSilently_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label23, "for", label23_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input25_id_value !== (input25_id_value = `moveSilently_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input25, "id", input25_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input25_name_value !== (input25_name_value = `moveSilently_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input25, "name", input25_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input25_value_value !== (input25_value_value = /*hexEditor*/ ctx[6]?.readField('moveSilently', /*idx*/ ctx[28])) && input25.value !== input25_value_value) {
    				prop_dev(input25, "value", input25_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label24_for_value !== (label24_for_value = `hideInShadows_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label24, "for", label24_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input26_id_value !== (input26_id_value = `hideInShadows_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input26, "id", input26_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input26_name_value !== (input26_name_value = `hideInShadows_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input26, "name", input26_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input26_value_value !== (input26_value_value = /*hexEditor*/ ctx[6]?.readField('hideInShadows', /*idx*/ ctx[28])) && input26.value !== input26_value_value) {
    				prop_dev(input26, "value", input26_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label25_for_value !== (label25_for_value = `lockpicking_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label25, "for", label25_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input27_id_value !== (input27_id_value = `lockpicking_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input27, "id", input27_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input27_name_value !== (input27_name_value = `lockpicking_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input27, "name", input27_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input27_value_value !== (input27_value_value = /*hexEditor*/ ctx[6]?.readField('lockpicking', /*idx*/ ctx[28])) && input27.value !== input27_value_value) {
    				prop_dev(input27, "value", input27_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label26_for_value !== (label26_for_value = `pickPockets_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label26, "for", label26_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input28_id_value !== (input28_id_value = `pickPockets_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input28, "id", input28_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input28_name_value !== (input28_name_value = `pickPockets_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input28, "name", input28_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input28_value_value !== (input28_value_value = /*hexEditor*/ ctx[6]?.readField('pickPockets', /*idx*/ ctx[28])) && input28.value !== input28_value_value) {
    				prop_dev(input28, "value", input28_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label27_for_value !== (label27_for_value = `findDisarmTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label27, "for", label27_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input29_id_value !== (input29_id_value = `findDisarmTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input29, "id", input29_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input29_name_value !== (input29_name_value = `findDisarmTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input29, "name", input29_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input29_value_value !== (input29_value_value = /*hexEditor*/ ctx[6]?.readField('findDisarmTraps', /*idx*/ ctx[28])) && input29.value !== input29_value_value) {
    				prop_dev(input29, "value", input29_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label28_for_value !== (label28_for_value = `setTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label28, "for", label28_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input30_id_value !== (input30_id_value = `setTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input30, "id", input30_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input30_name_value !== (input30_name_value = `setTraps_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input30, "name", input30_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input30_value_value !== (input30_value_value = /*hexEditor*/ ctx[6]?.readField('setTraps', /*idx*/ ctx[28])) && input30.value !== input30_value_value) {
    				prop_dev(input30, "value", input30_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label29_for_value !== (label29_for_value = `detectIllusion_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label29, "for", label29_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input31_id_value !== (input31_id_value = `detectIllusion_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input31, "id", input31_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input31_name_value !== (input31_name_value = `detectIllusion_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input31, "name", input31_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input31_value_value !== (input31_value_value = /*hexEditor*/ ctx[6]?.readField('detectIllusion', /*idx*/ ctx[28])) && input31.value !== input31_value_value) {
    				prop_dev(input31, "value", input31_value_value);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div47, "active", /*activeTab*/ ctx[7] === 0);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label30_for_value !== (label30_for_value = `gender_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label30, "for", label30_for_value);
    			}

    			if (dirty & /*Object, genders*/ 0) {
    				each_value_8 = Object.entries(genders);
    				validate_each_argument(each_value_8);
    				let i;

    				for (i = 0; i < each_value_8.length; i += 1) {
    					const child_ctx = get_each_context_8(ctx, each_value_8, i);

    					if (each_blocks_7[i]) {
    						each_blocks_7[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_7[i] = create_each_block_8(child_ctx);
    						each_blocks_7[i].c();
    						each_blocks_7[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_7.length; i += 1) {
    					each_blocks_7[i].d(1);
    				}

    				each_blocks_7.length = each_value_8.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select0_id_value !== (select0_id_value = `gender_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select0, "id", select0_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select0_name_value !== (select0_name_value = `gender_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select0, "name", select0_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select0_value_value !== (select0_value_value = /*hexEditor*/ ctx[6]?.readField('gender', /*idx*/ ctx[28]).toString())) {
    				select_option(select0, /*hexEditor*/ ctx[6]?.readField('gender', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label31_for_value !== (label31_for_value = `race_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label31, "for", label31_for_value);
    			}

    			if (dirty & /*Object, races*/ 0) {
    				each_value_7 = Object.entries(races);
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_6[i]) {
    						each_blocks_6[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_6[i] = create_each_block_7(child_ctx);
    						each_blocks_6[i].c();
    						each_blocks_6[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_6.length; i += 1) {
    					each_blocks_6[i].d(1);
    				}

    				each_blocks_6.length = each_value_7.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select1_id_value !== (select1_id_value = `race_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select1, "id", select1_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select1_name_value !== (select1_name_value = `race_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select1, "name", select1_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select1_value_value !== (select1_value_value = /*hexEditor*/ ctx[6]?.readField('race', /*idx*/ ctx[28]).toString())) {
    				select_option(select1, /*hexEditor*/ ctx[6]?.readField('race', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label32_for_value !== (label32_for_value = `alignment_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label32, "for", label32_for_value);
    			}

    			if (dirty & /*Object, alignments*/ 0) {
    				each_value_6 = Object.entries(alignments);
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_5[i] = create_each_block_6(child_ctx);
    						each_blocks_5[i].c();
    						each_blocks_5[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_5.length; i += 1) {
    					each_blocks_5[i].d(1);
    				}

    				each_blocks_5.length = each_value_6.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select2_id_value !== (select2_id_value = `alignment_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select2, "id", select2_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select2_name_value !== (select2_name_value = `alignment_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select2, "name", select2_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select2_value_value !== (select2_value_value = /*hexEditor*/ ctx[6]?.readField('alignment', /*idx*/ ctx[28]).toString())) {
    				select_option(select2, /*hexEditor*/ ctx[6]?.readField('alignment', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label33_for_value !== (label33_for_value = `class_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label33, "for", label33_for_value);
    			}

    			if (dirty & /*Object, classes*/ 0) {
    				each_value_5 = Object.entries(classes);
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_5(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(select3, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_5.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select3_id_value !== (select3_id_value = `class_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select3, "id", select3_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select3_name_value !== (select3_name_value = `class_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select3, "name", select3_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select3_value_value !== (select3_value_value = /*hexEditor*/ ctx[6]?.readField('class', /*idx*/ ctx[28]).toString())) {
    				select_option(select3, /*hexEditor*/ ctx[6]?.readField('class', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label34_for_value !== (label34_for_value = `kit_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label34, "for", label34_for_value);
    			}

    			if (dirty & /*Object, kits*/ 0) {
    				each_value_4 = Object.entries(kits);
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_4(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(select4, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_4.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select4_id_value !== (select4_id_value = `kit_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select4, "id", select4_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select4_name_value !== (select4_name_value = `kit_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select4, "name", select4_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select4_value_value !== (select4_value_value = /*hexEditor*/ ctx[6]?.readField('kit', /*idx*/ ctx[28]).toString())) {
    				select_option(select4, /*hexEditor*/ ctx[6]?.readField('kit', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label35_for_value !== (label35_for_value = `racialEnemy_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label35, "for", label35_for_value);
    			}

    			if (dirty & /*Object, races*/ 0) {
    				each_value_3 = Object.entries(races);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_3(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select5, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_3.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select5_id_value !== (select5_id_value = `racialEnemy_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select5, "id", select5_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select5_name_value !== (select5_name_value = `racialEnemy_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select5, "name", select5_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select5_value_value !== (select5_value_value = /*hexEditor*/ ctx[6]?.readField('racialEnemy', /*idx*/ ctx[28]).toString())) {
    				select_option(select5, /*hexEditor*/ ctx[6]?.readField('racialEnemy', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label36_for_value !== (label36_for_value = `enemyAlly_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label36, "for", label36_for_value);
    			}

    			if (dirty & /*Object, eas*/ 0) {
    				each_value_2 = Object.entries(eas);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select6, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select6_id_value !== (select6_id_value = `enemyAlly_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select6, "id", select6_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select6_name_value !== (select6_name_value = `enemyAlly_${/*idx*/ ctx[28]}`)) {
    				attr_dev(select6, "name", select6_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && select6_value_value !== (select6_value_value = /*hexEditor*/ ctx[6]?.readField('enemyAlly', /*idx*/ ctx[28]).toString())) {
    				select_option(select6, /*hexEditor*/ ctx[6]?.readField('enemyAlly', /*idx*/ ctx[28]).toString());
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label37_for_value !== (label37_for_value = `movementSpeed_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label37, "for", label37_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input32_id_value !== (input32_id_value = `movementSpeed_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input32, "id", input32_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input32_name_value !== (input32_name_value = `movementSpeed_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input32, "name", input32_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label38_for_value !== (label38_for_value = `strongestKillName_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label38, "for", label38_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input33_id_value !== (input33_id_value = `strongestKillName_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input33, "id", input33_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input33_name_value !== (input33_name_value = `strongestKillName_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input33, "name", input33_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label39_for_value !== (label39_for_value = `strongestKillXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label39, "for", label39_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input34_id_value !== (input34_id_value = `strongestKillXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input34, "id", input34_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input34_name_value !== (input34_name_value = `strongestKillXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input34, "name", input34_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input34_value_value !== (input34_value_value = /*hexEditor*/ ctx[6]?.readField('strongestKillXP', /*idx*/ ctx[28])) && input34.value !== input34_value_value) {
    				prop_dev(input34, "value", input34_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label40_for_value !== (label40_for_value = `chapterKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label40, "for", label40_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input35_id_value !== (input35_id_value = `chapterKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input35, "id", input35_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input35_name_value !== (input35_name_value = `chapterKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input35, "name", input35_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input35_value_value !== (input35_value_value = /*hexEditor*/ ctx[6]?.readField('chapterKillsCount', /*idx*/ ctx[28])) && input35.value !== input35_value_value) {
    				prop_dev(input35, "value", input35_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label41_for_value !== (label41_for_value = `chapterKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label41, "for", label41_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input36_id_value !== (input36_id_value = `chapterKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input36, "id", input36_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input36_name_value !== (input36_name_value = `chapterKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input36, "name", input36_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input36_value_value !== (input36_value_value = /*hexEditor*/ ctx[6]?.readField('chapterKillsXP', /*idx*/ ctx[28])) && input36.value !== input36_value_value) {
    				prop_dev(input36, "value", input36_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label42_for_value !== (label42_for_value = `gameKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label42, "for", label42_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input37_id_value !== (input37_id_value = `gameKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input37, "id", input37_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input37_name_value !== (input37_name_value = `gameKillsCount_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input37, "name", input37_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input37_value_value !== (input37_value_value = /*hexEditor*/ ctx[6]?.readField('gameKillsCount', /*idx*/ ctx[28])) && input37.value !== input37_value_value) {
    				prop_dev(input37, "value", input37_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label43_for_value !== (label43_for_value = `gameKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label43, "for", label43_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input38_id_value !== (input38_id_value = `gameKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input38, "id", input38_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input38_name_value !== (input38_name_value = `gameKillsXP_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input38, "name", input38_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input38_value_value !== (input38_value_value = /*hexEditor*/ ctx[6]?.readField('gameKillsXP', /*idx*/ ctx[28])) && input38.value !== input38_value_value) {
    				prop_dev(input38, "value", input38_value_value);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div72, "active", /*activeTab*/ ctx[7] === 1);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label44_for_value !== (label44_for_value = `resistAcid_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label44, "for", label44_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input39_id_value !== (input39_id_value = `resistAcid_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input39, "id", input39_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input39_name_value !== (input39_name_value = `resistAcid_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input39, "name", input39_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input39_value_value !== (input39_value_value = /*hexEditor*/ ctx[6]?.readField('resistAcid', /*idx*/ ctx[28])) && input39.value !== input39_value_value) {
    				prop_dev(input39, "value", input39_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label45_for_value !== (label45_for_value = `resistSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label45, "for", label45_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input40_id_value !== (input40_id_value = `resistSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input40, "id", input40_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input40_name_value !== (input40_name_value = `resistSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input40, "name", input40_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input40_value_value !== (input40_value_value = /*hexEditor*/ ctx[6]?.readField('resistSlashing', /*idx*/ ctx[28])) && input40.value !== input40_value_value) {
    				prop_dev(input40, "value", input40_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label46_for_value !== (label46_for_value = `resistCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label46, "for", label46_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input41_id_value !== (input41_id_value = `resistCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input41, "id", input41_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input41_name_value !== (input41_name_value = `resistCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input41, "name", input41_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input41_value_value !== (input41_value_value = /*hexEditor*/ ctx[6]?.readField('resistCold', /*idx*/ ctx[28])) && input41.value !== input41_value_value) {
    				prop_dev(input41, "value", input41_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label47_for_value !== (label47_for_value = `resistMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label47, "for", label47_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input42_id_value !== (input42_id_value = `resistMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input42, "id", input42_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input42_name_value !== (input42_name_value = `resistMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input42, "name", input42_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input42_value_value !== (input42_value_value = /*hexEditor*/ ctx[6]?.readField('resistMissile', /*idx*/ ctx[28])) && input42.value !== input42_value_value) {
    				prop_dev(input42, "value", input42_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label48_for_value !== (label48_for_value = `resistElectricity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label48, "for", label48_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input43_id_value !== (input43_id_value = `resistElectricity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input43, "id", input43_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input43_name_value !== (input43_name_value = `resistElectricity_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input43, "name", input43_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input43_value_value !== (input43_value_value = /*hexEditor*/ ctx[6]?.readField('resistElectricity', /*idx*/ ctx[28])) && input43.value !== input43_value_value) {
    				prop_dev(input43, "value", input43_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label49_for_value !== (label49_for_value = `resistMagic_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label49, "for", label49_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input44_id_value !== (input44_id_value = `resistMagic_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input44, "id", input44_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input44_name_value !== (input44_name_value = `resistMagic_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input44, "name", input44_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input44_value_value !== (input44_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagic', /*idx*/ ctx[28])) && input44.value !== input44_value_value) {
    				prop_dev(input44, "value", input44_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label50_for_value !== (label50_for_value = `resistFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label50, "for", label50_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input45_id_value !== (input45_id_value = `resistFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input45, "id", input45_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input45_name_value !== (input45_name_value = `resistFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input45, "name", input45_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input45_value_value !== (input45_value_value = /*hexEditor*/ ctx[6]?.readField('resistFire', /*idx*/ ctx[28])) && input45.value !== input45_value_value) {
    				prop_dev(input45, "value", input45_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label51_for_value !== (label51_for_value = `resistMagicFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label51, "for", label51_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input46_id_value !== (input46_id_value = `resistMagicFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input46, "id", input46_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input46_name_value !== (input46_name_value = `resistMagicFire_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input46, "name", input46_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input46_value_value !== (input46_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagicFire', /*idx*/ ctx[28])) && input46.value !== input46_value_value) {
    				prop_dev(input46, "value", input46_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label52_for_value !== (label52_for_value = `resistCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label52, "for", label52_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input47_id_value !== (input47_id_value = `resistCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input47, "id", input47_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input47_name_value !== (input47_name_value = `resistCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input47, "name", input47_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input47_value_value !== (input47_value_value = /*hexEditor*/ ctx[6]?.readField('resistCrushing', /*idx*/ ctx[28])) && input47.value !== input47_value_value) {
    				prop_dev(input47, "value", input47_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label53_for_value !== (label53_for_value = `resistMagicCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label53, "for", label53_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input48_id_value !== (input48_id_value = `resistMagicCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input48, "id", input48_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input48_name_value !== (input48_name_value = `resistMagicCold_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input48, "name", input48_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input48_value_value !== (input48_value_value = /*hexEditor*/ ctx[6]?.readField('resistMagicCold', /*idx*/ ctx[28])) && input48.value !== input48_value_value) {
    				prop_dev(input48, "value", input48_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label54_for_value !== (label54_for_value = `resistPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label54, "for", label54_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input49_id_value !== (input49_id_value = `resistPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input49, "id", input49_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input49_name_value !== (input49_name_value = `resistPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input49, "name", input49_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input49_value_value !== (input49_value_value = /*hexEditor*/ ctx[6]?.readField('resistPiercing', /*idx*/ ctx[28])) && input49.value !== input49_value_value) {
    				prop_dev(input49, "value", input49_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label55_for_value !== (label55_for_value = `saveVsDeath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label55, "for", label55_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input50_id_value !== (input50_id_value = `saveVsDeath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input50, "id", input50_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input50_name_value !== (input50_name_value = `saveVsDeath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input50, "name", input50_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input50_value_value !== (input50_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsDeath', /*idx*/ ctx[28])) && input50.value !== input50_value_value) {
    				prop_dev(input50, "value", input50_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label56_for_value !== (label56_for_value = `saveVsWands_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label56, "for", label56_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input51_id_value !== (input51_id_value = `saveVsWands_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input51, "id", input51_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input51_name_value !== (input51_name_value = `saveVsWands_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input51, "name", input51_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input51_value_value !== (input51_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsWands', /*idx*/ ctx[28])) && input51.value !== input51_value_value) {
    				prop_dev(input51, "value", input51_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label57_for_value !== (label57_for_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label57, "for", label57_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input52_id_value !== (input52_id_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input52, "id", input52_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input52_name_value !== (input52_name_value = `saveVsPolymorph_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input52, "name", input52_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input52_value_value !== (input52_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsPolymorph', /*idx*/ ctx[28])) && input52.value !== input52_value_value) {
    				prop_dev(input52, "value", input52_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label58_for_value !== (label58_for_value = `saveVsBreath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label58, "for", label58_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input53_id_value !== (input53_id_value = `saveVsBreath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input53, "id", input53_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input53_name_value !== (input53_name_value = `saveVsBreath_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input53, "name", input53_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input53_value_value !== (input53_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsBreath', /*idx*/ ctx[28])) && input53.value !== input53_value_value) {
    				prop_dev(input53, "value", input53_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label59_for_value !== (label59_for_value = `saveVsSpells_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label59, "for", label59_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input54_id_value !== (input54_id_value = `saveVsSpells_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input54, "id", input54_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input54_name_value !== (input54_name_value = `saveVsSpells_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input54, "name", input54_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input54_value_value !== (input54_value_value = /*hexEditor*/ ctx[6]?.readField('saveVsSpells', /*idx*/ ctx[28])) && input54.value !== input54_value_value) {
    				prop_dev(input54, "value", input54_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label60_for_value !== (label60_for_value = `acSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label60, "for", label60_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input55_id_value !== (input55_id_value = `acSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input55, "id", input55_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input55_name_value !== (input55_name_value = `acSlashing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input55, "name", input55_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input55_value_value !== (input55_value_value = /*hexEditor*/ ctx[6]?.readField('acSlashing', /*idx*/ ctx[28])) && input55.value !== input55_value_value) {
    				prop_dev(input55, "value", input55_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label61_for_value !== (label61_for_value = `acMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label61, "for", label61_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input56_id_value !== (input56_id_value = `acMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input56, "id", input56_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input56_name_value !== (input56_name_value = `acMissile_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input56, "name", input56_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input56_value_value !== (input56_value_value = /*hexEditor*/ ctx[6]?.readField('acMissile', /*idx*/ ctx[28])) && input56.value !== input56_value_value) {
    				prop_dev(input56, "value", input56_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label62_for_value !== (label62_for_value = `acCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label62, "for", label62_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input57_id_value !== (input57_id_value = `acCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input57, "id", input57_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input57_name_value !== (input57_name_value = `acCrushing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input57, "name", input57_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input57_value_value !== (input57_value_value = /*hexEditor*/ ctx[6]?.readField('acCrushing', /*idx*/ ctx[28])) && input57.value !== input57_value_value) {
    				prop_dev(input57, "value", input57_value_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && label63_for_value !== (label63_for_value = `acPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(label63, "for", label63_for_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input58_id_value !== (input58_id_value = `acPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input58, "id", input58_id_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input58_name_value !== (input58_name_value = `acPiercing_${/*idx*/ ctx[28]}`)) {
    				attr_dev(input58, "name", input58_name_value);
    			}

    			if (dirty[0] & /*hexEditor*/ 64 && input58_value_value !== (input58_value_value = /*hexEditor*/ ctx[6]?.readField('acPiercing', /*idx*/ ctx[28])) && input58.value !== input58_value_value) {
    				prop_dev(input58, "value", input58_value_value);
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div96, "active", /*activeTab*/ ctx[7] === 2);
    			}

    			if (dirty[0] & /*hexEditor*/ 64) {
    				each_value_1 = Array(/*hexEditor*/ ctx[6]?.getCharacterProficienciesCount(/*idx*/ ctx[28])).fill(null).map(func_3);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div97, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*activeTab*/ 128) {
    				toggle_class(div98, "active", /*activeTab*/ ctx[7] === 3);
    			}

    			if (dirty[0] & /*currentCharIdx, hexEditor*/ 320) {
    				toggle_class(div100, "hidden", /*currentCharIdx*/ ctx[8] !== /*idx*/ ctx[28]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div100);
    			destroy_each(each_blocks_7, detaching);
    			destroy_each(each_blocks_6, detaching);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(203:40) {#each Array(hexEditor?.readField('partyMembersStructCount')).fill(null).map((_, i) => i) as idx}",
    		ctx
    	});

    	return block;
    }

    // (612:68) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text(" ");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(612:68) {:else}",
    		ctx
    	});

    	return block;
    }

    // (612:63) 
    function create_if_block_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Ready");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(612:63) ",
    		ctx
    	});

    	return block;
    }

    // (612:20) {#if isLoading}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Loading...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(612:20) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let a;
    	let t1;
    	let div11;
    	let div10;
    	let div2;
    	let div0;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let button0;
    	let t5;
    	let button1;
    	let t6;
    	let button2;
    	let t7;
    	let div3;
    	let button3;
    	let t9;
    	let button4;
    	let t11;
    	let button5;
    	let t13;
    	let button6;
    	let t15;
    	let button7;
    	let t17;
    	let button8;
    	let t19;
    	let button9;
    	let t21;
    	let div4;
    	let t22;
    	let div5;
    	let input;
    	let t23;
    	let button10;
    	let t24;
    	let button11;
    	let t25;
    	let div7;
    	let div6;
    	let t26;
    	let div9;
    	let div8;
    	let mounted;
    	let dispose;
    	let if_block0 = /*isReady*/ ctx[4] && create_if_block_2(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*isLoading*/ ctx[5]) return create_if_block;
    		if (/*isReady*/ ctx[4]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			a = element("a");
    			a.textContent = "Download";
    			t1 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t2 = text(" JSEE Keeper - Version ");
    			t3 = text(/*version*/ ctx[0]);
    			t4 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t5 = space();
    			button1 = element("button");
    			t6 = space();
    			button2 = element("button");
    			t7 = space();
    			div3 = element("div");
    			button3 = element("button");
    			button3.textContent = "File";
    			t9 = space();
    			button4 = element("button");
    			button4.textContent = "Edit";
    			t11 = space();
    			button5 = element("button");
    			button5.textContent = "View";
    			t13 = space();
    			button6 = element("button");
    			button6.textContent = "Tools";
    			t15 = space();
    			button7 = element("button");
    			button7.textContent = "Settings";
    			t17 = space();
    			button8 = element("button");
    			button8.textContent = "Window";
    			t19 = space();
    			button9 = element("button");
    			button9.textContent = "Help";
    			t21 = space();
    			div4 = element("div");
    			t22 = space();
    			div5 = element("div");
    			input = element("input");
    			t23 = space();
    			button10 = element("button");
    			t24 = space();
    			button11 = element("button");
    			t25 = space();
    			div7 = element("div");
    			div6 = element("div");
    			if (if_block0) if_block0.c();
    			t26 = space();
    			div9 = element("div");
    			div8 = element("div");
    			if_block1.c();
    			attr_dev(a, "href", "#download");
    			set_style(a, "display", "none");
    			attr_dev(a, "download", "");
    			add_location(a, file, 141, 4, 4568);
    			attr_dev(span, "class", "logo svelte-1k2g6qq");
    			add_location(span, file, 145, 44, 4824);
    			attr_dev(div0, "class", "title-bar-text svelte-1k2g6qq");
    			add_location(div0, file, 145, 16, 4796);
    			attr_dev(button0, "aria-label", "Minimize");
    			add_location(button0, file, 147, 20, 4958);
    			attr_dev(button1, "aria-label", "Maximize");
    			add_location(button1, file, 148, 20, 5018);
    			attr_dev(button2, "aria-label", "Close");
    			add_location(button2, file, 149, 20, 5078);
    			attr_dev(div1, "class", "title-bar-controls");
    			add_location(div1, file, 146, 16, 4905);
    			attr_dev(div2, "class", "title-bar svelte-1k2g6qq");
    			add_location(div2, file, 144, 12, 4756);
    			button3.disabled = true;
    			attr_dev(button3, "class", "svelte-1k2g6qq");
    			add_location(button3, file, 153, 16, 5207);
    			button4.disabled = true;
    			attr_dev(button4, "class", "svelte-1k2g6qq");
    			add_location(button4, file, 154, 16, 5254);
    			button5.disabled = true;
    			attr_dev(button5, "class", "svelte-1k2g6qq");
    			add_location(button5, file, 155, 16, 5301);
    			button6.disabled = true;
    			attr_dev(button6, "class", "svelte-1k2g6qq");
    			add_location(button6, file, 156, 16, 5348);
    			button7.disabled = true;
    			attr_dev(button7, "class", "svelte-1k2g6qq");
    			add_location(button7, file, 157, 16, 5396);
    			button8.disabled = true;
    			attr_dev(button8, "class", "svelte-1k2g6qq");
    			add_location(button8, file, 158, 16, 5447);
    			button9.disabled = true;
    			attr_dev(button9, "class", "svelte-1k2g6qq");
    			add_location(button9, file, 159, 16, 5496);
    			attr_dev(div3, "class", "toolbar svelte-1k2g6qq");
    			add_location(div3, file, 152, 12, 5169);
    			attr_dev(div4, "class", "toolbar-separator svelte-1k2g6qq");
    			add_location(div4, file, 161, 12, 5558);
    			set_style(input, "display", "none");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".gam");
    			add_location(input, file, 163, 16, 5660);
    			attr_dev(button10, "id", "file-button");
    			attr_dev(button10, "class", "open-button svelte-1k2g6qq");
    			add_location(button10, file, 164, 16, 5792);
    			attr_dev(button11, "class", "save-button svelte-1k2g6qq");
    			add_location(button11, file, 165, 16, 5901);
    			attr_dev(div5, "class", "toolbar icons-toolbar svelte-1k2g6qq");
    			add_location(div5, file, 162, 12, 5608);
    			attr_dev(div6, "class", "outer-inner-window-container inner-window-container svelte-1k2g6qq");
    			add_location(div6, file, 168, 16, 6053);
    			attr_dev(div7, "class", "window-body svelte-1k2g6qq");
    			add_location(div7, file, 167, 12, 6011);
    			attr_dev(div8, "class", "status svelte-1k2g6qq");
    			add_location(div8, file, 610, 16, 54362);
    			attr_dev(div9, "class", "status-bar");
    			add_location(div9, file, 609, 12, 54321);
    			attr_dev(div10, "class", "window outer-window svelte-1k2g6qq");
    			add_location(div10, file, 143, 8, 4710);
    			attr_dev(div11, "class", "window-container svelte-1k2g6qq");
    			attr_dev(div11, "style", "");
    			add_location(div11, file, 142, 4, 4662);
    			add_location(main, file, 140, 0, 4557);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, a);
    			/*a_binding*/ ctx[16](a);
    			append_dev(main, t1);
    			append_dev(main, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t5);
    			append_dev(div1, button1);
    			append_dev(div1, t6);
    			append_dev(div1, button2);
    			append_dev(div10, t7);
    			append_dev(div10, div3);
    			append_dev(div3, button3);
    			append_dev(div3, t9);
    			append_dev(div3, button4);
    			append_dev(div3, t11);
    			append_dev(div3, button5);
    			append_dev(div3, t13);
    			append_dev(div3, button6);
    			append_dev(div3, t15);
    			append_dev(div3, button7);
    			append_dev(div3, t17);
    			append_dev(div3, button8);
    			append_dev(div3, t19);
    			append_dev(div3, button9);
    			append_dev(div10, t21);
    			append_dev(div10, div4);
    			append_dev(div10, t22);
    			append_dev(div10, div5);
    			append_dev(div5, input);
    			/*input_binding*/ ctx[18](input);
    			append_dev(div5, t23);
    			append_dev(div5, button10);
    			append_dev(div5, t24);
    			append_dev(div5, button11);
    			append_dev(div10, t25);
    			append_dev(div10, div7);
    			append_dev(div7, div6);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(div10, t26);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			if_block1.m(div8, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*change_handler*/ ctx[17], false, false, false),
    					listen_dev(button10, "click", /*click_handler*/ ctx[19], false, false, false),
    					listen_dev(button11, "click", /*click_handler_1*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*version*/ 1) set_data_dev(t3, /*version*/ ctx[0]);

    			if (/*isReady*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div6, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div8, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*a_binding*/ ctx[16](null);
    			/*input_binding*/ ctx[18](null);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = (_, i) => i;
    const func_1 = (_, i) => i;
    const func_2 = (_, i) => i;
    const func_3 = (_, i) => i;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { version } = $$props;
    	let fileinput;
    	let submitButton;
    	let filename;
    	let isReady = false;
    	let isLoading = false;
    	let hexEditor;
    	let activeTab = 0;
    	let currentCharIdx = 0;
    	let downloadUrl;
    	let downloadLink;

    	onMount(async () => {
    		const file = localStorage.getItem('file');

    		if (file === null) {
    			return;
    		}

    		$$invalidate(5, isLoading = true);
    		const uint8array = JSON.parse(file);
    		$$invalidate(6, hexEditor = new GamV20HexEditor(uint8array));

    		if (hexEditor.isValidGamFile) {
    			$$invalidate(3, filename = localStorage.getItem('filename'));

    			if (null !== localStorage.getItem('activeTab')) {
    				$$invalidate(7, activeTab = parseInt(localStorage.getItem('activeTab'), 10));
    			}

    			if (null !== localStorage.getItem('current_character')) {
    				$$invalidate(8, currentCharIdx = parseInt(localStorage.getItem('current_character'), 10));
    			}

    			$$invalidate(4, isReady = true);
    		} else {
    			localStorage.removeItem('file');
    			localStorage.removeItem('filename');
    			localStorage.removeItem('current_character');
    			$$invalidate(4, isReady = false);
    		}

    		$$invalidate(5, isLoading = false);
    	});

    	const onFileSelected = e => {
    		if (!e.target.files || !e.target.files[0]) {
    			// No file selected
    			$$invalidate(4, isReady = hexEditor && hexEditor.isValidGamFile); // Check if we still have a valid file loaded

    			return;
    		}

    		$$invalidate(4, isReady = false);
    		$$invalidate(5, isLoading = true);
    		const inputFileName = e.target.files[0].name;
    		const reader = new FileReader();
    		reader.readAsArrayBuffer(e.target.files[0]);

    		reader.onload = e => {
    			let res = [];

    			// noinspection JSCheckFunctionSignatures
    			let uint8array = new Uint8Array(e.target.result);

    			for (let i in uint8array) {
    				res.push((0 + uint8array[i].toString(16)).slice(-2));
    			}

    			$$invalidate(6, hexEditor = new GamV20HexEditor(uint8array));

    			if (hexEditor.isValidGamFile) {
    				localStorage.setItem('file', JSON.stringify(res));
    				localStorage.setItem('filename', inputFileName);
    				$$invalidate(8, currentCharIdx = 0);
    				localStorage.setItem('current_character', currentCharIdx);
    				$$invalidate(3, filename = inputFileName);
    				$$invalidate(4, isReady = true);
    			} else {
    				localStorage.removeItem('file');
    				localStorage.removeItem('filename');
    				localStorage.removeItem('current_character');
    				$$invalidate(4, isReady = false);
    			}

    			$$invalidate(5, isLoading = false);
    		};
    	};

    	const getPcPortraitUrl = characterIdx => {
    		const mediumPortrait = hexEditor?.readField('mediumPortrait', characterIdx);

    		if (!portraits.includes(mediumPortrait)) {
    			return '/portraits/UNKOWNM.png';
    		}

    		return '/portraits/' + mediumPortrait + '.png';
    	};

    	const onTabClick = tabIdx => {
    		$$invalidate(7, activeTab = tabIdx);
    		localStorage.setItem('activeTab', tabIdx);
    	};

    	const getCharacterName = characterIdx => {
    		if (characterIdx === 0) {
    			return hexEditor?.readField('name', characterIdx);
    		}

    		return hexEditor?.readField('nonPcCharsName', characterIdx);
    	};

    	const switchCharacter = e => {
    		$$invalidate(8, currentCharIdx = parseInt(e.target.value, 10));
    		localStorage.setItem('current_character', currentCharIdx);
    	};

    	const saveChanges = e => {
    		const formData = new FormData(e.target);

    		for (const [fieldName, fieldValue] of formData.entries()) {
    			const [fieldName2, characterIdx] = fieldName.split('_');
    			const [fieldId, proficiencyIdx] = fieldName2.split('-');
    			hexEditor.writeField(fieldValue, fieldId, parseInt(characterIdx, 10), parseInt(proficiencyIdx, 10));
    		}

    		const blob = new Blob([hexEditor.exportAsInt8Array()], { type: 'application/octet-stream' });
    		$$invalidate(9, downloadLink.download = filename, downloadLink);
    		$$invalidate(9, downloadLink.href = window.URL.createObjectURL(blob), downloadLink);
    		downloadLink.click();
    	};

    	const writable_props = ['version'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function a_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			downloadLink = $$value;
    			$$invalidate(9, downloadLink);
    		});
    	}

    	const change_handler = e => onFileSelected(e);

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			fileinput = $$value;
    			$$invalidate(1, fileinput);
    		});
    	}

    	const click_handler = () => {
    		fileinput?.click();
    	};

    	const click_handler_1 = () => {
    		submitButton?.click();
    	};

    	const change_handler_1 = e => switchCharacter(e);
    	const click_handler_2 = () => onTabClick(0);
    	const click_handler_3 = () => onTabClick(1);
    	const click_handler_4 = () => onTabClick(2);
    	const click_handler_5 = () => onTabClick(3);

    	function button4_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			submitButton = $$value;
    			$$invalidate(2, submitButton);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('version' in $$props) $$invalidate(0, version = $$props.version);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		GamV20HexEditor,
    		portraits,
    		genders,
    		races,
    		alignments,
    		classes,
    		kits,
    		eas,
    		proficiencies,
    		version,
    		fileinput,
    		submitButton,
    		filename,
    		isReady,
    		isLoading,
    		hexEditor,
    		activeTab,
    		currentCharIdx,
    		downloadUrl,
    		downloadLink,
    		onFileSelected,
    		getPcPortraitUrl,
    		onTabClick,
    		getCharacterName,
    		switchCharacter,
    		saveChanges
    	});

    	$$self.$inject_state = $$props => {
    		if ('version' in $$props) $$invalidate(0, version = $$props.version);
    		if ('fileinput' in $$props) $$invalidate(1, fileinput = $$props.fileinput);
    		if ('submitButton' in $$props) $$invalidate(2, submitButton = $$props.submitButton);
    		if ('filename' in $$props) $$invalidate(3, filename = $$props.filename);
    		if ('isReady' in $$props) $$invalidate(4, isReady = $$props.isReady);
    		if ('isLoading' in $$props) $$invalidate(5, isLoading = $$props.isLoading);
    		if ('hexEditor' in $$props) $$invalidate(6, hexEditor = $$props.hexEditor);
    		if ('activeTab' in $$props) $$invalidate(7, activeTab = $$props.activeTab);
    		if ('currentCharIdx' in $$props) $$invalidate(8, currentCharIdx = $$props.currentCharIdx);
    		if ('downloadUrl' in $$props) downloadUrl = $$props.downloadUrl;
    		if ('downloadLink' in $$props) $$invalidate(9, downloadLink = $$props.downloadLink);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		version,
    		fileinput,
    		submitButton,
    		filename,
    		isReady,
    		isLoading,
    		hexEditor,
    		activeTab,
    		currentCharIdx,
    		downloadLink,
    		onFileSelected,
    		getPcPortraitUrl,
    		onTabClick,
    		getCharacterName,
    		switchCharacter,
    		saveChanges,
    		a_binding,
    		change_handler,
    		input_binding,
    		click_handler,
    		click_handler_1,
    		change_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		button4_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { version: 0 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*version*/ ctx[0] === undefined && !('version' in props)) {
    			console.warn("<App> was created without expected prop 'version'");
    		}
    	}

    	get version() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		version: '1.0.0'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
