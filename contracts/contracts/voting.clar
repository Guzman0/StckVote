;; voting.clar - StackVote on-chain voting
;; Clarity 6 / epoch 4.0

(define-constant err-not-found (err u100))
(define-constant err-empty-title (err u101))
(define-constant err-empty-option (err u102))
(define-constant err-invalid-option (err u103))
(define-constant err-already-voted (err u104))

;; Running counter that gives every poll a unique, sequential ID.
(define-data-var poll-count uint u0)

;; poll-id -> poll details
(define-map polls
  uint
  {
    title: (string-ascii 120),
    option-a: (string-ascii 80),
    option-b: (string-ascii 80),
    votes-a: uint,
    votes-b: uint,
    creator: principal
  }
)

;; (poll-id, voter) -> true once the voter has cast a ballot.
(define-map votes
  { poll-id: uint, voter: principal }
  bool
)

(define-read-only (get-poll-count)
  (ok (var-get poll-count)))

(define-read-only (get-poll (poll-id uint))
  (match (map-get? polls poll-id)
    poll (ok poll)
    err-not-found))

(define-read-only (get-results (poll-id uint))
  (match (map-get? polls poll-id)
    poll (ok {
      votes-a: (get votes-a poll),
      votes-b: (get votes-b poll),
      total-votes: (+ (get votes-a poll) (get votes-b poll))
    })
    err-not-found))

(define-read-only (has-voted (poll-id uint) (voter principal))
  (ok (default-to false (map-get? votes { poll-id: poll-id, voter: voter }))))

(define-public (create-poll (title (string-ascii 120)) (option-a (string-ascii 80)) (option-b (string-ascii 80)))
  (begin
    (asserts! (> (len title) u0) err-empty-title)
    (asserts! (> (len option-a) u0) err-empty-option)
    (asserts! (> (len option-b) u0) err-empty-option)
    (let ((poll-id (+ (var-get poll-count) u1)))
      (map-set polls poll-id {
        title: title,
        option-a: option-a,
        option-b: option-b,
        votes-a: u0,
        votes-b: u0,
        creator: contract-caller
      })
      (var-set poll-count poll-id)
      (ok poll-id))))

(define-public (vote (poll-id uint) (option uint))
  (begin
    (asserts! (is-some (map-get? polls poll-id)) err-not-found)
    (asserts! (or (is-eq option u1) (is-eq option u2)) err-invalid-option)
    (asserts! (not (unwrap! (has-voted poll-id contract-caller) err-not-found)) err-already-voted)
    (map-set votes { poll-id: poll-id, voter: contract-caller } true)
    (let ((poll (unwrap! (map-get? polls poll-id) err-not-found)))
      (map-set polls poll-id
        (merge poll
          { votes-a: (if (is-eq option u1) (+ (get votes-a poll) u1) (get votes-a poll)),
            votes-b: (if (is-eq option u2) (+ (get votes-b poll) u1) (get votes-b poll)) }))
      (ok true))))
