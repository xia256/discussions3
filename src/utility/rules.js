import { validateUsername } from "./index";
//import api from "../server/api";

function emailRules(email) {
    const regex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    return {
        emailRules() {
            const rules = [];
            if (!regex.test(email)) {
                rules.push(`Invalid e-mail`);
            }
            return rules;
        }
    }
}

function confirmPasswordRules(password, confirmPassword) {
    return {
        confirmPasswordRules() {
            const rules = [];
            if (this[password] != this[confirmPassword]) {
                rules.push(`Passwords do not match`);
            }
            return rules;
        }
    }
}

function passwordRules(password) {
    return {
        passwordRules() {
            const rules = [];
            if (this[password].length < 5) {
                rules.push(`Password must be at least 5 characters`);
            }
            // TO-DO: other password requirements
            return rules;
        }
    }
}

function usernameRules(username) {
    return {
        usernameRules() {
            const rules = [];
            try {
                validateUsername(this[username]);
            }
            catch (ex) {
                rules.push(ex.message);
            }
            return rules;
        }
    }
}


export {
    emailRules,
    confirmPasswordRules,
    passwordRules,
    usernameRules
}