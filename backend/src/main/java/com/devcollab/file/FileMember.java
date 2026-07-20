package com.devcollab.file;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "file_members")
@IdClass(FileMemberId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FileMember {

    @Id
    @Column(name = "file_id")
    private UUID fileId;

    @Id
    @Column(name = "user_id")
    private UUID userId;
}
