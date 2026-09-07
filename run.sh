while true; do
    node find-undownloaded.js | head -1  | xargs -I {} node download-one.js {}

    # Capture the output of the command
    output=$(node find-undownloaded.js)

    # Check if the output is empty
    if [[ -z "$output" ]]; then
        break
    fi

    X=$((3 + RANDOM % 6));
    echo "sleep ${X} seconds";
    sleep ${X};
done
