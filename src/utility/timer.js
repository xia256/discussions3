export default class Timer {
    static start(timeout, callbackAsync) {
        setTimeout(async () => {

            const reschedule = await callbackAsync(this);
            if (reschedule > 0) {
                Timer.start(reschedule, callbackAsync);
            }

        }, timeout);
    }
}