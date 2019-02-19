export function locationWithoutQuery() {
    return location.protocol + '//' + location.hostname + (location.port ? ":" + location.port : "") + location.pathname;
}
